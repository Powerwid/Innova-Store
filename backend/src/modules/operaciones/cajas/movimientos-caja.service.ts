import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { OperacionesAccesoService } from '../compartido/operaciones-acceso.service.js';
import {
  MOTIVOS_EGRESO_SISTEMA,
  MOTIVOS_INGRESO_SISTEMA,
} from '../compartido/operaciones.constants.js';
import {
  egresoInclude,
  ingresoInclude,
} from '../compartido/operaciones.selects.js';
import {
  type ConsultaPaginada,
  type Db,
} from '../compartido/operaciones.types.js';
import {
  decimal,
  dinero,
  fecha,
  pagina,
  paginar,
  sucursales,
  sumarPagos,
} from '../compartido/operaciones.utils.js';
import { CajasService } from './cajas.service.js';
import { type EgresoInput, type IngresoInput } from './cajas.types.js';

@Injectable()
export class MovimientosCajaService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OperacionesAccesoService)
    private readonly acceso: OperacionesAccesoService,
    @Inject(CajasService) private readonly cajas: CajasService,
  ) {}

  // Los métodos Tx usan la transacción del caso de uso; no abren otra.
  private async validarMotivoIngreso(db: Db, idMotivoIngreso: number) {
    const motivo = await db.motivoIngreso.findUnique({
      where: { idMotivoIngreso },
    });
    if (!motivo) {
      throw new BadRequestException('Motivo de ingreso no encontrado');
    }
    if (!motivo.activo) {
      throw new BadRequestException('El motivo de ingreso está inactivo');
    }
    return motivo;
  }

  private async validarMotivoEgreso(db: Db, idMotivoEgreso: number) {
    const motivo = await db.motivoEgreso.findUnique({
      where: { idMotivoEgreso },
    });
    if (!motivo) {
      throw new BadRequestException('Motivo de egreso no encontrado');
    }
    if (!motivo.activo) {
      throw new BadRequestException('El motivo de egreso está inactivo');
    }
    return motivo;
  }

  async crearIngresoTx(
    db: Db,
    dto: IngresoInput,
    actor: UsuarioAutenticado,
    exigirPagoCompleto = true,
  ) {
    await this.cajas.obtenerCajaAbierta(db, dto.idCaja, dto.idSucursal, actor);
    await this.validarMotivoIngreso(db, dto.idMotivoIngreso);
    await this.cajas.validarMediosPago(db, dto.pagos);

    const monto = decimal(dto.monto);
    const totalPagos = dinero(sumarPagos(dto.pagos));
    if (totalPagos.gt(monto)) {
      throw new BadRequestException(
        'La suma de los pagos no puede superar el monto del ingreso',
      );
    }
    if (exigirPagoCompleto && !totalPagos.eq(monto)) {
      throw new BadRequestException(
        'La suma de los pagos debe coincidir con el monto del ingreso',
      );
    }

    const ingreso = await db.ingreso.create({
      data: {
        idCaja: dto.idCaja,
        idSucursal: dto.idSucursal,
        idMotivoIngreso: dto.idMotivoIngreso,
        idUsuario: actor.idUsuario,
        monto,
        detalle: dto.detalle ?? null,
        fechaIngreso: fecha(dto.fechaIngreso),
        ...(dto.pagos.length > 0
          ? {
              pagos: {
                create: dto.pagos.map((pago) => ({
                  idMedioPago: pago.idMedioPago,
                  monto: pago.monto,
                })),
              },
            }
          : {}),
      },
    });
    await this.cajas.aplicarPagosCaja(db, dto.idCaja, dto.pagos, 'ENTRADA');
    return ingreso;
  }

  async crearEgresoTx(
    db: Db,
    dto: EgresoInput,
    actor: UsuarioAutenticado,
    opciones: { exigirPagoCompleto?: boolean; idCompra?: number } = {},
  ) {
    await this.cajas.obtenerCajaAbierta(db, dto.idCaja, dto.idSucursal, actor);
    await this.validarMotivoEgreso(db, dto.idMotivoEgreso);
    await this.cajas.validarMediosPago(db, dto.pagos);

    const monto = decimal(dto.monto);
    const totalPagos = dinero(sumarPagos(dto.pagos));
    if (totalPagos.gt(monto)) {
      throw new BadRequestException(
        'La suma de los pagos no puede superar el monto del egreso',
      );
    }
    if ((opciones.exigirPagoCompleto ?? true) && !totalPagos.eq(monto)) {
      throw new BadRequestException(
        'La suma de los pagos debe coincidir con el monto del egreso',
      );
    }

    const egreso = await db.egreso.create({
      data: {
        idCaja: dto.idCaja,
        idSucursal: dto.idSucursal,
        idMotivoEgreso: dto.idMotivoEgreso,
        idCompra: opciones.idCompra,
        idUsuario: actor.idUsuario,
        monto,
        detalle: dto.detalle ?? null,
        fechaEgreso: fecha(dto.fechaEgreso),
        ...(dto.pagos.length > 0
          ? {
              pagos: {
                create: dto.pagos.map((pago) => ({
                  idMedioPago: pago.idMedioPago,
                  monto: pago.monto,
                })),
              },
            }
          : {}),
      },
    });
    await this.cajas.aplicarPagosCaja(db, dto.idCaja, dto.pagos, 'SALIDA');
    return egreso;
  }

  listarIngresos(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.IngresoWhereInput = {
      idSucursal: sucursales(q, actor),
      idCaja: q.idCaja,
      idMotivoIngreso: q.idMotivoIngreso,
      detalle: q.buscar ? { contains: q.buscar } : undefined,
      fechaIngreso: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
    };
    return pagina(
      q,
      this.prisma.ingreso.findMany({
        where,
        include: ingresoInclude,
        ...paginar(q),
        orderBy: { fechaIngreso: 'desc' },
      }),
      this.prisma.ingreso.count({ where }),
    );
  }

  async obtenerIngreso(
    idIngreso: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
  ) {
    const ingreso = await db.ingreso.findUnique({
      where: { idIngreso },
      include: ingresoInclude,
    });
    if (!ingreso) throw new NotFoundException('Ingreso no encontrado');
    await this.acceso.validarSucursal(ingreso.idSucursal, actor, db, false);
    return ingreso;
  }

  crearIngreso(dto: IngresoInput, actor: UsuarioAutenticado) {
    if (MOTIVOS_INGRESO_SISTEMA.has(dto.idMotivoIngreso)) {
      throw new BadRequestException(
        'Este motivo solo puede generarse mediante su operación correspondiente',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const ingreso = await this.crearIngresoTx(tx, dto, actor);
      return {
        message: 'Ingreso registrado correctamente',
        ingreso: await this.obtenerIngreso(ingreso.idIngreso, actor, tx),
      };
    });
  }

  listarEgresos(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.EgresoWhereInput = {
      idSucursal: sucursales(q, actor),
      idCaja: q.idCaja,
      idMotivoEgreso: q.idMotivoEgreso,
      idCompra: q.idCompra,
      detalle: q.buscar ? { contains: q.buscar } : undefined,
      fechaEgreso: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
    };
    return pagina(
      q,
      this.prisma.egreso.findMany({
        where,
        include: egresoInclude,
        ...paginar(q),
        orderBy: { fechaEgreso: 'desc' },
      }),
      this.prisma.egreso.count({ where }),
    );
  }

  async obtenerEgreso(
    idEgreso: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
  ) {
    const egreso = await db.egreso.findUnique({
      where: { idEgreso },
      include: egresoInclude,
    });
    if (!egreso) throw new NotFoundException('Egreso no encontrado');
    await this.acceso.validarSucursal(egreso.idSucursal, actor, db, false);
    return egreso;
  }

  crearEgreso(dto: EgresoInput, actor: UsuarioAutenticado) {
    if (MOTIVOS_EGRESO_SISTEMA.has(dto.idMotivoEgreso)) {
      throw new BadRequestException(
        'Este motivo solo puede generarse mediante su operación correspondiente',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const egreso = await this.crearEgresoTx(tx, dto, actor);
      return {
        message: 'Egreso registrado correctamente',
        egreso: await this.obtenerEgreso(egreso.idEgreso, actor, tx),
      };
    });
  }
}
