import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import  type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { MovimientosCajaService } from '../cajas/movimientos-caja.service.js';
import { MOTIVO_EGRESO_PERCEPCION } from '../compartido/operaciones.constants.js';
import type { ConsultaPaginada, Db } from '../compartido/operaciones.types.js';
import {
  decimal,
  dinero,
  fecha,
  paginar,
  sucursales,
  sumarPagos,
} from '../compartido/operaciones.utils.js';
import { type CrearPercepcionInput } from './compras.types.js';

@Injectable()
export class PercepcionesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MovimientosCajaService)
    private readonly movimientos: MovimientosCajaService,
  ) { }

  // Los métodos Tx usan la transacción del caso de uso; no abren otra.
  async listarPercepciones(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const buscar = q.buscar?.trim();
    const where: Prisma.CompraPercepcionWhereInput = {
      idCompra: q.idCompra,
      compra: {
        idSucursal: sucursales(q, actor),
        idProveedor: q.idProveedor,
      },
      // fechaPercepcion es DATE: los límites representan días completos.
      fechaPercepcion: {
        gte: fecha(q.desde),
        lte: fecha(q.hasta),
      },
      ...(buscar
        ? {
          OR: [
            { numeroConstancia: { contains: buscar } },
            { compra: { nombreProveedor: { contains: buscar } } },
            {
              compra: {
                comprobante: {
                  OR: [
                    { serie: { contains: buscar } },
                    { numero: { contains: buscar } },
                  ],
                },
              },
            },
          ],
        }
        : {}),
    };

    // Historial y totales deben corresponder a la misma lectura, sin paginar la suma.
    return this.prisma.$transaction(
      async (db) => {
        const data = await db.compraPercepcion.findMany({
          where,
          ...paginar(q),
          orderBy: [{ fechaPercepcion: 'desc' }, { idPercepcion: 'desc' }],
          include: {
            compra: {
              select: {
                idCompra: true,
                idSucursal: true,
                idProveedor: true,
                nombreProveedor: true,
                comprobante: { select: { serie: true, numero: true } },
              },
            },
          },
        });
        const resumen = await db.compraPercepcion.aggregate({
          where,
          _sum: { monto: true },
          _count: { _all: true },
        });
        const numeroCompras = await db.compra.count({
          where: { percepciones: { some: where } },
        });
        return {
          data,
          total: resumen._count._all,
          pagina: q.pagina,
          limite: q.limite,
          resumen: {
            montoTotal: (resumen._sum.monto ?? new Prisma.Decimal(0)).toFixed(
              2,
            ),
            numeroPercepciones: resumen._count._all,
            numeroCompras,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async crearPercepcionTx(
    db: Db,
    compra: { idCompra: number; idSucursal: number; total: Prisma.Decimal },
    dto: CrearPercepcionInput,
    actor: UsuarioAutenticado,
  ) {
    if (dto.idSucursal !== compra.idSucursal) {
      throw new BadRequestException(
        'La percepción debe registrarse en la sucursal de la compra',
      );
    }
    const montoCalculado = dinero(
      decimal(dto.baseCalculo).times(dto.porcentaje).dividedBy(100),
    );
    if (!montoCalculado.eq(dto.monto)) {
      throw new BadRequestException(
        'El monto de la percepción debe ser igual a la base por el porcentaje',
      );
    }
    if (!dinero(sumarPagos(dto.pagos)).eq(dto.monto)) {
      throw new BadRequestException(
        'La suma de los pagos debe coincidir con el monto de la percepción',
      );
    }
    const anteriores = await db.compraPercepcion.findMany({
      where: { idCompra: compra.idCompra },
      select: { baseCalculo: true, numeroConstancia: true },
    });
    const numeroConstancia = dto.numeroConstancia?.trim() || null;
    if (
      numeroConstancia &&
      anteriores.some(
        (p) =>
          p.numeroConstancia?.trim().toLocaleLowerCase() ===
          numeroConstancia.toLocaleLowerCase(),
      )
    ) {
      throw new ConflictException(
        'Este comprobante de percepción ya está registrado en la compra',
      );
    }
    const baseRegistrada = anteriores.reduce(
      (total, percepcion) => total.plus(percepcion.baseCalculo),
      new Prisma.Decimal(0),
    );
    const baseDisponible = Prisma.Decimal.max(
      0,
      compra.total.minus(baseRegistrada),
    );
    if (baseDisponible.isZero()) {
      throw new ConflictException(
        'La compra ya tiene registrada la percepción sobre todo su importe',
      );
    }
    if (decimal(dto.baseCalculo).gt(baseDisponible)) {
      throw new ConflictException(
        `La base de esta percepción supera el importe pendiente de percepción (S/ ${baseDisponible.toFixed(2)})`,
      );
    }
    const egreso = await this.movimientos.crearEgresoTx(
      db,
      {
        idCaja: dto.idCaja,
        idSucursal: dto.idSucursal,
        idMotivoEgreso: MOTIVO_EGRESO_PERCEPCION,
        monto: dto.monto,
        detalle: `Percepción de la compra #${compra.idCompra}`,
        // La fecha de percepción es un día civil de Perú, no medianoche UTC.
        fechaEgreso: `${dto.fechaPercepcion}T00:00:00-05:00`,
        pagos: dto.pagos,
      },
      actor,
      { idCompra: compra.idCompra },
    );
    return db.compraPercepcion.create({
      data: {
        idCompra: compra.idCompra,
        idEgreso: egreso.idEgreso,
        fechaPercepcion: new Date(dto.fechaPercepcion),
        baseCalculo: dto.baseCalculo,
        porcentaje: dto.porcentaje,
        monto: dto.monto,
        numeroConstancia,
      },
    });
  }
}
