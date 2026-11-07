import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { MovimientosCajaService } from '../cajas/movimientos-caja.service.js';
import { OperacionesAccesoService } from '../compartido/operaciones-acceso.service.js';
import { MOTIVO_INGRESO_ABONO_DEUDA } from '../compartido/operaciones.constants.js';
import { deudaInclude } from '../compartido/operaciones.selects.js';
import type { ConsultaPaginada, Db } from '../compartido/operaciones.types.js';
import { decimal, dinero, sucursales } from '../compartido/operaciones.utils.js';
import type { AbonoInput } from './cuentas-por-cobrar.types.js';

@Injectable()
export class CuentasPorCobrarService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OperacionesAccesoService)
    private readonly acceso: OperacionesAccesoService,
    @Inject(MovimientosCajaService)
    private readonly movimientos: MovimientosCajaService,
  ) { }

  private deudaConSaldo<
    T extends {
      fechaVencimiento: Date | null;
      egreso: { monto: Prisma.Decimal };
      abonos: Array<{ ingresoAbono: { monto: Prisma.Decimal } }>;
    },
  >(deuda: T) {
    const montoAbonado = dinero(
      deuda.abonos.reduce(
        (total, abono) => total.plus(abono.ingresoAbono.monto),
        new Prisma.Decimal(0),
      ),
    );
    const saldoPendiente = dinero(deuda.egreso.monto.minus(montoAbonado));
    const hoyLima = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const vencida =
      deuda.fechaVencimiento !== null &&
      deuda.fechaVencimiento.toISOString().slice(0, 10) < hoyLima;
    const estado = saldoPendiente.lte(0)
      ? 'PAGADA'
      : vencida
        ? 'VENCIDA'
        : montoAbonado.gt(0)
          ? 'PARCIAL'
          : 'PENDIENTE';
    return {
      ...deuda,
      montoOriginal: deuda.egreso.monto.toFixed(2),
      montoAbonado: montoAbonado.toFixed(2),
      saldoPendiente: saldoPendiente.toFixed(2),
      estado,
    };
  }

  async listarDeudasClientes(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.DeudaClienteWhereInput = {
      idCliente: q.idCliente,
      ingresoOrigen: {
        idSucursal: sucursales(q, actor),
      },
      cliente: q.buscar
        ? {
          OR: [
            { nombre: { contains: q.buscar } },
            { numeroDocumento: { contains: q.buscar } },
          ],
        }
        : undefined,
      createdAt: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
    };
    const deudas = await this.prisma.deudaCliente.findMany({
      where,
      include: deudaInclude,
      orderBy: { createdAt: 'desc' },
    });
    const filtradas = deudas
      .map((deuda) => this.deudaConSaldo(deuda))
      .filter((deuda) => !q.estado || deuda.estado === q.estado);
    const inicio = (q.pagina - 1) * q.limite;
    return {
      data: filtradas.slice(inicio, inicio + q.limite),
      total: filtradas.length,
      pagina: q.pagina,
      limite: q.limite,
    };
  }

  async obtenerDeudaCliente(
    idDeudaCliente: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
  ) {
    const deuda = await db.deudaCliente.findUnique({
      where: { idDeudaCliente },
      include: deudaInclude,
    });
    if (!deuda) throw new NotFoundException('Deuda no encontrada');
    await this.acceso.validarSucursal(
      deuda.ingresoOrigen.idSucursal,
      actor,
      db,
      false,
    );
    return this.deudaConSaldo(deuda);
  }

  crearAbonoDeuda(
    idDeudaCliente: number,
    dto: AbonoInput,
    actor: UsuarioAutenticado,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_deuda_cliente FROM deudas_clientes WHERE id_deuda_cliente = ${idDeudaCliente} FOR UPDATE`;
      const deuda = await tx.deudaCliente.findUnique({
        where: { idDeudaCliente },
        include: {
          ingresoOrigen: true,
          egreso: true,
          abonos: { include: { ingresoAbono: true } },
        },
      });
      if (!deuda) throw new NotFoundException('Deuda no encontrada');
      await this.acceso.validarSucursal(
        deuda.ingresoOrigen.idSucursal,
        actor,
        tx,
        false,
      );
      if (dto.idSucursal !== deuda.ingresoOrigen.idSucursal) {
        throw new BadRequestException(
          'El abono debe registrarse en la sucursal donde se originó la deuda',
        );
      }

      const abonado = deuda.abonos.reduce(
        (total, abono) => total.plus(abono.ingresoAbono.monto),
        new Prisma.Decimal(0),
      );
      const saldo = deuda.egreso.monto.minus(abonado);
      const monto = decimal(dto.monto);
      if (saldo.lte(0)) {
        throw new ConflictException('La deuda ya está pagada');
      }
      if (monto.gt(saldo)) {
        throw new ConflictException(
          'El abono supera el saldo pendiente de la deuda',
        );
      }

      const ingreso = await this.movimientos.crearIngresoTx(
        tx,
        {
          ...dto,
          idMotivoIngreso: MOTIVO_INGRESO_ABONO_DEUDA,
          detalle: dto.detalle ?? `Abono de la deuda #${idDeudaCliente}`,
        },
        actor,
      );
      await tx.abonoDeudaCliente.create({
        data: {
          idDeudaCliente,
          idIngresoAbono: ingreso.idIngreso,
        },
      });
      return {
        message: 'Abono registrado correctamente',
        deuda: await this.obtenerDeudaCliente(idDeudaCliente, actor, tx),
      };
    });
  }
}
