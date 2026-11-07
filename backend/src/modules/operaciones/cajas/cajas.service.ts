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
import { OperacionesAccesoService } from '../compartido/operaciones-acceso.service.js';
import {
  MEDIO_PAGO_EFECTIVO,
  MEDIO_PAGO_FRACCIONADO,
} from '../compartido/operaciones.constants.js';
import { cajaInclude } from '../compartido/operaciones.selects.js';
import {
  type ConsultaPaginada,
  type Db,
  type PagoInput,
} from '../compartido/operaciones.types.js';
import {
  decimal,
  pagina,
  paginar,
  sucursales,
} from '../compartido/operaciones.utils.js';
import { calcularResumenCaja } from './caja-resumen.js';
import { type AbrirCajaInput, type CerrarCajaInput } from './cajas.types.js';

@Injectable()
export class CajasService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OperacionesAccesoService)
    private readonly acceso: OperacionesAccesoService,
  ) {}

  async validarMediosPago(db: Db, pagos: PagoInput[]) {
    const ids = pagos.map(({ idMedioPago }) => idMedioPago);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Cada medio de pago debe aparecer una sola vez',
      );
    }
    if (ids.length === 0) return [];

    const medios = await db.medioPago.findMany({
      where: { idMedioPago: { in: ids } },
    });
    if (medios.length !== ids.length) {
      throw new BadRequestException('Uno de los medios de pago no existe');
    }
    if (medios.some(({ nombre }) => nombre === MEDIO_PAGO_FRACCIONADO)) {
      throw new BadRequestException(
        'Fraccionado no es un medio de pago real; envía cada medio utilizado',
      );
    }
    return medios;
  }

  async obtenerCajaAbierta(
    db: Db,
    idCaja: number,
    idSucursal: number,
    actor: UsuarioAutenticado,
    bloquear = true,
  ) {
    await this.acceso.validarSucursal(idSucursal, actor, db);
    if (bloquear) {
      await db.$queryRaw`SELECT id_caja FROM cajas WHERE id_caja = ${idCaja} FOR UPDATE`;
    }
    const caja = await db.caja.findUnique({ where: { idCaja } });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    if (caja.idSucursal !== idSucursal) {
      throw new BadRequestException(
        'La caja no pertenece a la sucursal seleccionada',
      );
    }
    if (caja.fechaCierre) {
      throw new ConflictException('La caja ya está cerrada');
    }
    return caja;
  }

  async aplicarPagosCaja(
    db: Db,
    idCaja: number,
    pagos: PagoInput[],
    naturaleza: 'ENTRADA' | 'SALIDA',
  ) {
    const medios = await this.validarMediosPago(db, pagos);
    const ordenados = [...pagos].sort((a, b) => a.idMedioPago - b.idMedioPago);
    for (const pago of ordenados) {
      await db.$queryRaw`SELECT monto FROM caja_detalle WHERE id_caja = ${idCaja} AND id_medio_pago = ${pago.idMedioPago} FOR UPDATE`;
      const actual = await db.cajaDetalle.findUnique({
        where: {
          idCaja_idMedioPago: {
            idCaja,
            idMedioPago: pago.idMedioPago,
          },
        },
      });
      const montoActual = actual?.monto ?? new Prisma.Decimal(0);
      const nuevoMonto =
        naturaleza === 'ENTRADA'
          ? montoActual.plus(pago.monto)
          : montoActual.minus(pago.monto);
      if (nuevoMonto.lt(0)) {
        const nombre = medios.find(
          (medio) => medio.idMedioPago === pago.idMedioPago,
        )!.nombre;
        throw new ConflictException(
          `Saldo insuficiente en ${nombre}. Disponible en caja: S/ ${montoActual.toFixed(2)}. Pago solicitado: S/ ${new Prisma.Decimal(pago.monto).toFixed(2)}.`,
        );
      }
      if (nuevoMonto.gt('999999999999.99')) {
        throw new BadRequestException(
          `El saldo del medio de pago ${pago.idMedioPago} supera el máximo permitido`,
        );
      }
      await db.cajaDetalle.upsert({
        where: {
          idCaja_idMedioPago: {
            idCaja,
            idMedioPago: pago.idMedioPago,
          },
        },
        create: {
          idCaja,
          idMedioPago: pago.idMedioPago,
          monto: nuevoMonto,
        },
        update: { monto: nuevoMonto },
      });
    }
  }

  listarCajas(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.CajaWhereInput = {
      idSucursal: sucursales(q, actor),
      fechaApertura: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
      fechaCierre:
        q.abierta === true
          ? null
          : q.abierta === false
            ? { not: null }
            : undefined,
    };
    return pagina(
      q,
      this.prisma.caja.findMany({
        where,
        include: cajaInclude,
        ...paginar(q),
        orderBy: { fechaApertura: 'desc' },
      }),
      this.prisma.caja.count({ where }),
    );
  }

  async obtenerCaja(
    idCaja: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
  ) {
    const caja = await db.caja.findUnique({
      where: { idCaja },
      include: cajaInclude,
    });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    await this.acceso.validarSucursal(caja.idSucursal, actor, db, false);
    return caja;
  }

  obtenerResumenCaja(idCaja: number, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(async (db) => {
      const caja = await this.obtenerCaja(idCaja, actor, db);
      const [ingresos, egresos] = await Promise.all([
        db.ingreso.findMany({
          where: { idCaja },
          select: {
            idMotivoIngreso: true,
            monto: true,
            pagos: { include: { medioPago: true } },
          },
        }),
        db.egreso.findMany({
          where: { idCaja },
          select: {
            idMotivoEgreso: true,
            idCompra: true,
            pagos: { include: { medioPago: true } },
          },
        }),
      ]);
      return { caja, resumen: calcularResumenCaja(caja, ingresos, egresos) };
    });
  }

  async obtenerCajaAbiertaSucursal(
    idSucursal: number,
    actor: UsuarioAutenticado,
  ) {
    await this.acceso.validarSucursal(idSucursal, actor, this.prisma, false);
    const caja = await this.prisma.caja.findFirst({
      where: { idSucursal, fechaCierre: null },
      include: cajaInclude,
      orderBy: { fechaApertura: 'desc' },
    });
    if (!caja) throw new NotFoundException('No hay una caja abierta');
    return caja;
  }

  abrirCaja(dto: AbrirCajaInput, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(async (tx) => {
      await this.acceso.validarSucursal(dto.idSucursal, actor, tx);
      await tx.$queryRaw`SELECT id_sucursal FROM sucursales WHERE id_sucursal = ${dto.idSucursal} FOR UPDATE`;
      const abierta = await tx.caja.findFirst({
        where: { idSucursal: dto.idSucursal, fechaCierre: null },
        select: { idCaja: true },
      });
      if (abierta) {
        throw new ConflictException('La sucursal ya tiene una caja abierta');
      }
      const efectivo = await tx.medioPago.findUnique({
        where: { nombre: MEDIO_PAGO_EFECTIVO },
        select: { idMedioPago: true },
      });
      if (!efectivo) {
        throw new BadRequestException(
          'El medio de pago Efectivo no está configurado',
        );
      }
      const caja = await tx.caja.create({
        data: {
          idSucursal: dto.idSucursal,
          idUsuarioApertura: actor.idUsuario,
          montoApertura: dto.montoApertura,
          detalles: {
            create: {
              idMedioPago: efectivo.idMedioPago,
              monto: dto.montoApertura,
            },
          },
        },
      });
      return {
        message: 'Caja abierta correctamente',
        caja: await this.obtenerCaja(caja.idCaja, actor, tx),
      };
    });
  }

  cerrarCaja(idCaja: number, dto: CerrarCajaInput, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_caja FROM cajas WHERE id_caja = ${idCaja} FOR UPDATE`;
      const caja = await this.obtenerCaja(idCaja, actor, tx);
      if (caja.fechaCierre) {
        throw new ConflictException('La caja ya está cerrada');
      }
      const montoEsperado = caja.detalles.reduce(
        (total, detalle) => total.plus(detalle.monto),
        new Prisma.Decimal(0),
      );
      const montoCierre = decimal(dto.montoCierre);
      await tx.caja.update({
        where: { idCaja },
        data: {
          idUsuarioCierre: actor.idUsuario,
          fechaCierre: new Date(),
          montoCierre,
        },
      });
      return {
        message: 'Caja cerrada correctamente',
        caja: await this.obtenerCaja(idCaja, actor, tx),
        montoEsperado: montoEsperado.toFixed(2),
        diferencia: montoCierre.minus(montoEsperado).toFixed(2),
      };
    });
  }
}
