import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  CONFIG_STOCK_NEGATIVO,
  MOVIMIENTO_COMPRA,
  MOVIMIENTO_VENTA,
} from '../logistica/logistica.constants.js';
import {
  MEDIO_PAGO_EFECTIVO,
  MEDIO_PAGO_FRACCIONADO,
  MOTIVO_EGRESO_COMPRA,
  MOTIVO_EGRESO_CREDITO_CLIENTE,
  MOTIVO_EGRESO_PERCEPCION,
  MOTIVO_INGRESO_ABONO_DEUDA,
  MOTIVO_INGRESO_VENTA,
  MOTIVOS_EGRESO_SISTEMA,
  MOTIVOS_INGRESO_SISTEMA,
} from './operaciones.constants.js';

type Db = Prisma.TransactionClient;
type DecimalValue = string | number;

interface PagoInput {
  idMedioPago: number;
  monto: string;
}

interface ConsultaPaginada {
  pagina: number;
  limite: number;
  buscar?: string;
  activo?: boolean;
  abierta?: boolean;
  idSucursal?: number;
  idCaja?: number;
  idCliente?: number;
  idMotivoIngreso?: number;
  idMotivoEgreso?: number;
  idCompra?: number;
  idProveedor?: number;
  idAlmacen?: number;
  desde?: string;
  hasta?: string;
  estado?: string;
}

interface AbrirCajaInput {
  idSucursal: number;
  montoApertura: string;
}

interface CerrarCajaInput {
  montoCierre: string;
}

interface MotivoInput {
  motivo: string;
  activo?: boolean;
}

interface TipoComprobanteInput {
  nombre: string;
  codigoSunat?: string | null;
}

interface MovimientoCajaInput {
  idCaja: number;
  idSucursal: number;
  monto: string;
  detalle?: string | null;
  pagos: PagoInput[];
  fechaIngreso?: string;
  fechaEgreso?: string;
}

interface IngresoInput extends MovimientoCajaInput {
  idMotivoIngreso: number;
}

interface EgresoInput extends MovimientoCajaInput {
  idMotivoEgreso: number;
}

interface VentaInput extends MovimientoCajaInput {
  productos: Array<{
    idProductoSucursal: number;
    idAlmacen: number;
    cantidad: string;
    precioUnitario: string;
  }>;
  credito?: {
    idCliente: number;
    fechaVencimiento?: string | null;
  } | null;
}

interface ComprobanteInput {
  idTipoComprobante: number;
  serie?: string | null;
  numero?: string | null;
  fechaEmision: string;
}

interface PercepcionInput {
  fechaPercepcion: string;
  baseCalculo: string;
  porcentaje: string;
  monto: string;
  numeroConstancia?: string | null;
  pagos: PagoInput[];
}

interface CompraInput {
  idCaja: number;
  idSucursal: number;
  idAlmacen: number;
  idProveedor?: number | null;
  nombreProveedor: string;
  fechaCompra?: string;
  subtotal?: string | null;
  igv?: string | null;
  total: string;
  detalles: Array<{
    idProductoSucursal: number;
    cantidad: string;
    precioUnitario: string;
  }>;
  comprobante?: ComprobanteInput | null;
  pagos: PagoInput[];
  percepcion?: PercepcionInput | null;
}

type PagoCompraInput = Omit<MovimientoCajaInput, 'monto'> & {
  monto?: string;
};

interface CrearPercepcionInput extends PercepcionInput {
  idCaja: number;
  idSucursal: number;
}

interface AbonoInput extends MovimientoCajaInput {}

const usuarioSelect = {
  idUsuario: true,
  correo: true,
  perfil: { select: { nombres: true, apellidos: true } },
} as const;

const cajaInclude = {
  sucursal: true,
  usuarioApertura: { select: usuarioSelect },
  usuarioCierre: { select: usuarioSelect },
  detalles: { include: { medioPago: true }, orderBy: { idMedioPago: 'asc' } },
} as const;

const ingresoInclude = {
  caja: true,
  sucursal: true,
  motivoIngreso: true,
  usuario: { select: usuarioSelect },
  pagos: { include: { medioPago: true }, orderBy: { idMedioPago: 'asc' } },
  productos: {
    include: {
      productoSucursal: {
        include: { producto: { include: { unidadMedida: true } } },
      },
      almacen: true,
    },
    orderBy: { idIngresoProducto: 'asc' },
  },
  deudaOriginada: {
    include: {
      cliente: { include: { tipoDocumento: true } },
      egreso: true,
    },
  },
  abonoDeuda: true,
} as const;

const egresoInclude = {
  caja: true,
  sucursal: true,
  motivoEgreso: true,
  usuario: { select: usuarioSelect },
  pagos: { include: { medioPago: true }, orderBy: { idMedioPago: 'asc' } },
  compra: true,
  percepciones: true,
  deudaCliente: true,
} as const;

const compraInclude = {
  proveedor: { include: { tipoDocumento: true } },
  sucursal: true,
  almacen: true,
  usuario: { select: usuarioSelect },
  detalles: {
    include: {
      productoSucursal: {
        include: { producto: { include: { unidadMedida: true } } },
      },
    },
    orderBy: { idCompraDetalle: 'asc' },
  },
  comprobante: { include: { tipoComprobante: true } },
  egresos: {
    include: {
      motivoEgreso: true,
      pagos: { include: { medioPago: true } },
      percepciones: true,
    },
    orderBy: { idEgreso: 'asc' },
  },
  percepciones: { include: { egreso: { include: { pagos: true } } } },
} as const;

const deudaInclude = {
  cliente: { include: { tipoDocumento: true } },
  ingresoOrigen: { include: ingresoInclude },
  egreso: { include: egresoInclude },
  abonos: {
    include: { ingresoAbono: { include: ingresoInclude } },
    orderBy: { idIngresoAbono: 'asc' },
  },
} as const;

@Injectable()
export class OperacionesService {
  constructor(private readonly prisma: PrismaService) {}

  private paginar(q: ConsultaPaginada) {
    return { skip: (q.pagina - 1) * q.limite, take: q.limite };
  }

  private async pagina<T>(
    q: ConsultaPaginada,
    datos: Promise<T[]>,
    cantidad: Promise<number>,
  ) {
    const [data, total] = await Promise.all([datos, cantidad]);
    return { data, total, pagina: q.pagina, limite: q.limite };
  }

  private decimal(value: DecimalValue) {
    return new Prisma.Decimal(value);
  }

  private dinero(value: Prisma.Decimal) {
    return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private sumarPagos(pagos: PagoInput[]) {
    return pagos.reduce(
      (total, pago) => total.plus(pago.monto),
      new Prisma.Decimal(0),
    );
  }

  private fecha(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private sucursales(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    if (
      q.idSucursal !== undefined &&
      !actor.sucursales.includes(q.idSucursal)
    ) {
      throw new ForbiddenException('No tiene acceso a esta sucursal');
    }
    return q.idSucursal ?? { in: actor.sucursales };
  }

  private async validarSucursal(
    idSucursal: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
    activa = true,
  ) {
    if (!actor.sucursales.includes(idSucursal)) {
      throw new ForbiddenException('No tiene acceso a esta sucursal');
    }
    const sucursal = await db.sucursal.findUnique({ where: { idSucursal } });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    if (activa && !sucursal.activo) {
      throw new BadRequestException('La sucursal está inactiva');
    }
    return sucursal;
  }

  private async validarMediosPago(db: Db, pagos: PagoInput[]) {
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

  private async obtenerCajaAbierta(
    db: Db,
    idCaja: number,
    idSucursal: number,
    actor: UsuarioAutenticado,
    bloquear = true,
  ) {
    await this.validarSucursal(idSucursal, actor, db);
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

  private async aplicarPagosCaja(
    db: Db,
    idCaja: number,
    pagos: PagoInput[],
    naturaleza: 'ENTRADA' | 'SALIDA',
  ) {
    await this.validarMediosPago(db, pagos);
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
        throw new ConflictException(
          `Saldo insuficiente en el medio de pago ${pago.idMedioPago}`,
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

  listarMotivosIngreso(q: ConsultaPaginada) {
    const where: Prisma.MotivoIngresoWhereInput = {
      motivo: q.buscar ? { contains: q.buscar } : undefined,
      activo: q.activo,
    };
    return this.pagina(
      q,
      this.prisma.motivoIngreso.findMany({
        where,
        ...this.paginar(q),
        orderBy: { motivo: 'asc' },
      }),
      this.prisma.motivoIngreso.count({ where }),
    );
  }

  async obtenerMotivoIngreso(idMotivoIngreso: number) {
    const motivo = await this.prisma.motivoIngreso.findUnique({
      where: { idMotivoIngreso },
    });
    if (!motivo) throw new NotFoundException('Motivo de ingreso no encontrado');
    return motivo;
  }

  async crearMotivoIngreso(dto: MotivoInput) {
    const motivoIngreso = await this.prisma.motivoIngreso.create({
      data: { motivo: dto.motivo, activo: dto.activo ?? true },
    });
    return { message: 'Motivo de ingreso creado correctamente', motivoIngreso };
  }

  async actualizarMotivoIngreso(id: number, dto: Partial<MotivoInput>) {
    await this.obtenerMotivoIngreso(id);
    if (MOTIVOS_INGRESO_SISTEMA.has(id)) {
      throw new ConflictException(
        'Este motivo es requerido por el sistema y no puede modificarse',
      );
    }
    const motivoIngreso = await this.prisma.motivoIngreso.update({
      where: { idMotivoIngreso: id },
      data: dto,
    });
    return {
      message: 'Motivo de ingreso actualizado correctamente',
      motivoIngreso,
    };
  }

  async eliminarMotivoIngreso(id: number) {
    await this.obtenerMotivoIngreso(id);
    if (MOTIVOS_INGRESO_SISTEMA.has(id)) {
      throw new ConflictException(
        'Este motivo es requerido por el sistema y no puede eliminarse',
      );
    }
    await this.prisma.motivoIngreso.delete({ where: { idMotivoIngreso: id } });
    return { message: 'Motivo de ingreso eliminado correctamente' };
  }

  listarMotivosEgreso(q: ConsultaPaginada) {
    const where: Prisma.MotivoEgresoWhereInput = {
      motivo: q.buscar ? { contains: q.buscar } : undefined,
      activo: q.activo,
    };
    return this.pagina(
      q,
      this.prisma.motivoEgreso.findMany({
        where,
        ...this.paginar(q),
        orderBy: { motivo: 'asc' },
      }),
      this.prisma.motivoEgreso.count({ where }),
    );
  }

  async obtenerMotivoEgreso(idMotivoEgreso: number) {
    const motivo = await this.prisma.motivoEgreso.findUnique({
      where: { idMotivoEgreso },
    });
    if (!motivo) throw new NotFoundException('Motivo de egreso no encontrado');
    return motivo;
  }

  async crearMotivoEgreso(dto: MotivoInput) {
    const motivoEgreso = await this.prisma.motivoEgreso.create({
      data: { motivo: dto.motivo, activo: dto.activo ?? true },
    });
    return { message: 'Motivo de egreso creado correctamente', motivoEgreso };
  }

  async actualizarMotivoEgreso(id: number, dto: Partial<MotivoInput>) {
    await this.obtenerMotivoEgreso(id);
    if (MOTIVOS_EGRESO_SISTEMA.has(id)) {
      throw new ConflictException(
        'Este motivo es requerido por el sistema y no puede modificarse',
      );
    }
    const motivoEgreso = await this.prisma.motivoEgreso.update({
      where: { idMotivoEgreso: id },
      data: dto,
    });
    return {
      message: 'Motivo de egreso actualizado correctamente',
      motivoEgreso,
    };
  }

  async eliminarMotivoEgreso(id: number) {
    await this.obtenerMotivoEgreso(id);
    if (MOTIVOS_EGRESO_SISTEMA.has(id)) {
      throw new ConflictException(
        'Este motivo es requerido por el sistema y no puede eliminarse',
      );
    }
    await this.prisma.motivoEgreso.delete({ where: { idMotivoEgreso: id } });
    return { message: 'Motivo de egreso eliminado correctamente' };
  }

  listarTiposComprobante(q: ConsultaPaginada) {
    const where: Prisma.TipoComprobanteWhereInput = {
      nombre: q.buscar ? { contains: q.buscar } : undefined,
    };
    return this.pagina(
      q,
      this.prisma.tipoComprobante.findMany({
        where,
        ...this.paginar(q),
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.tipoComprobante.count({ where }),
    );
  }

  async obtenerTipoComprobante(idTipoComprobante: number) {
    const tipo = await this.prisma.tipoComprobante.findUnique({
      where: { idTipoComprobante },
    });
    if (!tipo) throw new NotFoundException('Tipo de comprobante no encontrado');
    return tipo;
  }

  async crearTipoComprobante(dto: TipoComprobanteInput) {
    const tipoComprobante = await this.prisma.tipoComprobante.create({
      data: {
        nombre: dto.nombre,
        codigoSunat: dto.codigoSunat ?? null,
      },
    });
    return {
      message: 'Tipo de comprobante creado correctamente',
      tipoComprobante,
    };
  }

  async actualizarTipoComprobante(
    id: number,
    dto: Partial<TipoComprobanteInput>,
  ) {
    await this.obtenerTipoComprobante(id);
    const tipoComprobante = await this.prisma.tipoComprobante.update({
      where: { idTipoComprobante: id },
      data: dto,
    });
    return {
      message: 'Tipo de comprobante actualizado correctamente',
      tipoComprobante,
    };
  }

  async eliminarTipoComprobante(id: number) {
    await this.obtenerTipoComprobante(id);
    await this.prisma.tipoComprobante.delete({
      where: { idTipoComprobante: id },
    });
    return { message: 'Tipo de comprobante eliminado correctamente' };
  }

  listarCajas(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.CajaWhereInput = {
      idSucursal: this.sucursales(q, actor),
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
    return this.pagina(
      q,
      this.prisma.caja.findMany({
        where,
        include: cajaInclude,
        ...this.paginar(q),
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
    await this.validarSucursal(caja.idSucursal, actor, db, false);
    return caja;
  }

  async obtenerCajaAbiertaSucursal(
    idSucursal: number,
    actor: UsuarioAutenticado,
  ) {
    await this.validarSucursal(idSucursal, actor, this.prisma, false);
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
      await this.validarSucursal(dto.idSucursal, actor, tx);
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
      const montoCierre = this.decimal(dto.montoCierre);
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

  private async crearIngresoTx(
    db: Db,
    dto: IngresoInput,
    actor: UsuarioAutenticado,
    exigirPagoCompleto = true,
  ) {
    await this.obtenerCajaAbierta(db, dto.idCaja, dto.idSucursal, actor);
    await this.validarMotivoIngreso(db, dto.idMotivoIngreso);
    await this.validarMediosPago(db, dto.pagos);

    const monto = this.decimal(dto.monto);
    const totalPagos = this.dinero(this.sumarPagos(dto.pagos));
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
        fechaIngreso: this.fecha(dto.fechaIngreso),
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
    await this.aplicarPagosCaja(db, dto.idCaja, dto.pagos, 'ENTRADA');
    return ingreso;
  }

  private async crearEgresoTx(
    db: Db,
    dto: EgresoInput,
    actor: UsuarioAutenticado,
    opciones: { exigirPagoCompleto?: boolean; idCompra?: number } = {},
  ) {
    await this.obtenerCajaAbierta(db, dto.idCaja, dto.idSucursal, actor);
    await this.validarMotivoEgreso(db, dto.idMotivoEgreso);
    await this.validarMediosPago(db, dto.pagos);

    const monto = this.decimal(dto.monto);
    const totalPagos = this.dinero(this.sumarPagos(dto.pagos));
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
        fechaEgreso: this.fecha(dto.fechaEgreso),
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
    await this.aplicarPagosCaja(db, dto.idCaja, dto.pagos, 'SALIDA');
    return egreso;
  }

  listarIngresos(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.IngresoWhereInput = {
      idSucursal: this.sucursales(q, actor),
      idCaja: q.idCaja,
      idMotivoIngreso: q.idMotivoIngreso,
      detalle: q.buscar ? { contains: q.buscar } : undefined,
      fechaIngreso: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
    };
    return this.pagina(
      q,
      this.prisma.ingreso.findMany({
        where,
        include: ingresoInclude,
        ...this.paginar(q),
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
    await this.validarSucursal(ingreso.idSucursal, actor, db, false);
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
      idSucursal: this.sucursales(q, actor),
      idCaja: q.idCaja,
      idMotivoEgreso: q.idMotivoEgreso,
      idCompra: q.idCompra,
      detalle: q.buscar ? { contains: q.buscar } : undefined,
      fechaEgreso: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
    };
    return this.pagina(
      q,
      this.prisma.egreso.findMany({
        where,
        include: egresoInclude,
        ...this.paginar(q),
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
    await this.validarSucursal(egreso.idSucursal, actor, db, false);
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

  private async validarLineaInventario(
    db: Db,
    idProductoSucursal: number,
    idAlmacen: number,
    idSucursal: number,
  ) {
    const [productoSucursal, almacen] = await Promise.all([
      db.productoSucursal.findUnique({
        where: { idProductoSucursal },
        include: { producto: true },
      }),
      db.almacen.findUnique({ where: { idAlmacen } }),
    ]);
    if (!productoSucursal) {
      throw new BadRequestException('Producto de sucursal no encontrado');
    }
    if (!almacen) throw new BadRequestException('Almacén no encontrado');
    if (productoSucursal.idSucursal !== idSucursal) {
      throw new BadRequestException(
        'El producto no pertenece a la sucursal de la operación',
      );
    }
    if (almacen.idSucursal !== idSucursal) {
      throw new BadRequestException(
        'El almacén no pertenece a la sucursal de la operación',
      );
    }
    if (!productoSucursal.estado || !productoSucursal.producto.estado) {
      throw new BadRequestException('El producto está inactivo');
    }
    if (!almacen.estado) {
      throw new BadRequestException('El almacén está inactivo');
    }
  }

  private async aplicarMovimientoInventario(
    db: Db,
    data: {
      idProductoSucursal: number;
      idAlmacen: number;
      idSucursal: number;
      cantidad: string;
      naturaleza: 'ENTRADA' | 'SALIDA';
      idCompraDetalle?: number;
      idIngresoProducto?: number;
      observacion: string;
    },
    actor: UsuarioAutenticado,
  ) {
    await db.$queryRaw`SELECT id_producto_sucursal FROM producto_sucursal WHERE id_producto_sucursal = ${data.idProductoSucursal} FOR UPDATE`;
    const productoSucursal = await db.productoSucursal.findUnique({
      where: { idProductoSucursal: data.idProductoSucursal },
      include: { producto: true },
    });
    if (!productoSucursal) {
      throw new BadRequestException('Producto de sucursal no encontrado');
    }
    if (productoSucursal.idSucursal !== data.idSucursal) {
      throw new BadRequestException(
        'El producto no pertenece a la sucursal de la operación',
      );
    }

    await db.$queryRaw`SELECT id_almacen FROM almacenes WHERE id_almacen = ${data.idAlmacen} FOR UPDATE`;
    const almacen = await db.almacen.findUnique({
      where: { idAlmacen: data.idAlmacen },
    });
    if (!almacen) throw new BadRequestException('Almacén no encontrado');
    if (almacen.idSucursal !== data.idSucursal) {
      throw new BadRequestException(
        'El almacén no pertenece a la sucursal de la operación',
      );
    }
    if (!productoSucursal.estado || !productoSucursal.producto.estado) {
      throw new BadRequestException('El producto está inactivo');
    }
    if (!almacen.estado) {
      throw new BadRequestException('El almacén está inactivo');
    }

    let inventario = await db.inventario.findUnique({
      where: {
        idProductoSucursal_idAlmacen: {
          idProductoSucursal: data.idProductoSucursal,
          idAlmacen: data.idAlmacen,
        },
      },
    });
    if (!inventario && data.naturaleza === 'SALIDA') {
      throw new ConflictException(
        'El producto no tiene inventario en el almacén seleccionado',
      );
    }
    if (!inventario) {
      inventario = await db.inventario.create({
        data: {
          idProductoSucursal: data.idProductoSucursal,
          idAlmacen: data.idAlmacen,
          idSucursal: data.idSucursal,
        },
      });
    }

    let permiteStockNegativo = false;
    if (data.naturaleza === 'SALIDA') {
      const [configuracion] = await db.$queryRaw<
        { activo: boolean | number }[]
      >`SELECT activo FROM configuraciones_globales WHERE nombre = ${CONFIG_STOCK_NEGATIVO} LOCK IN SHARE MODE`;
      if (!configuracion) {
        throw new NotFoundException('Configuración global no encontrada');
      }
      permiteStockNegativo = Boolean(configuracion.activo);
    }

    await db.$queryRaw`SELECT id_inventario FROM inventarios WHERE id_inventario = ${inventario.idInventario} FOR UPDATE`;
    inventario = (await db.inventario.findUnique({
      where: { idInventario: inventario.idInventario },
    }))!;

    const idTipoMovimiento =
      data.naturaleza === 'ENTRADA' ? MOVIMIENTO_COMPRA : MOVIMIENTO_VENTA;
    const tipoMovimiento = await db.tipoMovimientoInventario.findUnique({
      where: { idTipoMovimiento },
    });
    if (!tipoMovimiento || tipoMovimiento.entradaSalida !== data.naturaleza) {
      throw new ConflictException(
        'El tipo de movimiento de inventario no está configurado correctamente',
      );
    }

    const cantidad = this.decimal(data.cantidad);
    const stockResultante =
      data.naturaleza === 'ENTRADA'
        ? inventario.stock.plus(cantidad)
        : inventario.stock.minus(cantidad);
    if (stockResultante.lt(0) && !permiteStockNegativo) {
      throw new ConflictException(
        'Stock insuficiente; el stock negativo está desactivado',
      );
    }
    if (stockResultante.abs().gt('99999999999.999')) {
      throw new BadRequestException('El stock supera el máximo permitido');
    }

    await db.inventario.update({
      where: { idInventario: inventario.idInventario },
      data: { stock: stockResultante },
    });
    return db.inventarioMovimiento.create({
      data: {
        idInventario: inventario.idInventario,
        idTipoMovimiento,
        idUsuario: actor.idUsuario,
        idCompraDetalle: data.idCompraDetalle,
        idIngresoProducto: data.idIngresoProducto,
        cantidad,
        stockAnterior: inventario.stock,
        stockResultante,
        observacion: data.observacion,
      },
    });
  }

  listarVentas(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.IngresoWhereInput = {
      idSucursal: this.sucursales(q, actor),
      idCaja: q.idCaja,
      idMotivoIngreso: MOTIVO_INGRESO_VENTA,
      productos: { some: {} },
      detalle: q.buscar ? { contains: q.buscar } : undefined,
      fechaIngreso: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
    };
    return this.pagina(
      q,
      this.prisma.ingreso.findMany({
        where,
        include: ingresoInclude,
        ...this.paginar(q),
        orderBy: { fechaIngreso: 'desc' },
      }),
      this.prisma.ingreso.count({ where }),
    );
  }

  async obtenerVenta(
    idVenta: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
  ) {
    const venta = await this.obtenerIngreso(idVenta, actor, db);
    if (
      venta.idMotivoIngreso !== MOTIVO_INGRESO_VENTA ||
      venta.productos.length === 0
    ) {
      throw new NotFoundException('Venta no encontrada');
    }
    return venta;
  }

  crearVenta(dto: VentaInput, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(async (tx) => {
      const totalProductos = this.dinero(
        dto.productos.reduce(
          (total, producto) =>
            total.plus(
              this.decimal(producto.cantidad).times(producto.precioUnitario),
            ),
          new Prisma.Decimal(0),
        ),
      );
      const totalVenta = this.decimal(dto.monto);
      if (!totalProductos.eq(totalVenta)) {
        throw new BadRequestException(
          'El total de la venta debe coincidir con sus productos',
        );
      }

      const montoPagado = this.dinero(this.sumarPagos(dto.pagos));
      const saldoCredito = this.dinero(totalVenta.minus(montoPagado));
      if (saldoCredito.lt(0)) {
        throw new BadRequestException(
          'La suma de los pagos no puede superar el total de la venta',
        );
      }
      if (saldoCredito.gt(0) && !dto.credito) {
        throw new BadRequestException(
          'Debe indicar el cliente cuando la venta deja saldo a crédito',
        );
      }
      if (saldoCredito.eq(0) && dto.credito) {
        throw new BadRequestException(
          'No debe indicar crédito cuando la venta está totalmente pagada',
        );
      }

      const ingreso = await this.crearIngresoTx(
        tx,
        {
          ...dto,
          idMotivoIngreso: MOTIVO_INGRESO_VENTA,
        },
        actor,
        false,
      );

      const productos = [...dto.productos].sort(
        (a, b) =>
          a.idProductoSucursal - b.idProductoSucursal ||
          a.idAlmacen - b.idAlmacen,
      );
      for (const producto of productos) {
        await this.validarLineaInventario(
          tx,
          producto.idProductoSucursal,
          producto.idAlmacen,
          dto.idSucursal,
        );
        const ingresoProducto = await tx.ingresoProducto.create({
          data: {
            idIngreso: ingreso.idIngreso,
            idProductoSucursal: producto.idProductoSucursal,
            idAlmacen: producto.idAlmacen,
            cantidad: producto.cantidad,
            precioUnitario: producto.precioUnitario,
          },
        });
        await this.aplicarMovimientoInventario(
          tx,
          {
            ...producto,
            idSucursal: dto.idSucursal,
            naturaleza: 'SALIDA',
            idIngresoProducto: ingresoProducto.idIngresoProducto,
            observacion: `Venta #${ingreso.idIngreso}`,
          },
          actor,
        );
      }

      if (saldoCredito.gt(0) && dto.credito) {
        const cliente = await tx.cliente.findUnique({
          where: { idCliente: dto.credito.idCliente },
        });
        if (!cliente) throw new BadRequestException('Cliente no encontrado');
        if (!cliente.activo) {
          throw new BadRequestException('El cliente está inactivo');
        }
        const egreso = await this.crearEgresoTx(
          tx,
          {
            idCaja: dto.idCaja,
            idSucursal: dto.idSucursal,
            idMotivoEgreso: MOTIVO_EGRESO_CREDITO_CLIENTE,
            monto: saldoCredito.toFixed(2),
            detalle: `Crédito generado por la venta #${ingreso.idIngreso}`,
            fechaEgreso: dto.fechaIngreso,
            pagos: [],
          },
          actor,
          { exigirPagoCompleto: false },
        );
        await tx.deudaCliente.create({
          data: {
            idCliente: dto.credito.idCliente,
            idIngresoOrigen: ingreso.idIngreso,
            idEgreso: egreso.idEgreso,
            fechaVencimiento: dto.credito.fechaVencimiento
              ? new Date(dto.credito.fechaVencimiento)
              : null,
          },
        });
      }

      return {
        message: 'Venta registrada correctamente',
        venta: await this.obtenerVenta(ingreso.idIngreso, actor, tx),
      };
    });
  }

  private compraConSaldo<
    T extends {
      total: Prisma.Decimal;
      egresos: Array<{
        idMotivoEgreso: number;
        monto: Prisma.Decimal;
      }>;
    },
  >(compra: T) {
    const montoPagado = this.dinero(
      compra.egresos
        .filter(({ idMotivoEgreso }) => idMotivoEgreso === MOTIVO_EGRESO_COMPRA)
        .reduce(
          (total, egreso) => total.plus(egreso.monto),
          new Prisma.Decimal(0),
        ),
    );
    return {
      ...compra,
      montoPagado: montoPagado.toFixed(2),
      saldoPendiente: compra.total.minus(montoPagado).toFixed(2),
    };
  }

  listarCompras(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.CompraWhereInput = {
      idSucursal: this.sucursales(q, actor),
      idProveedor: q.idProveedor,
      idAlmacen: q.idAlmacen,
      nombreProveedor: q.buscar ? { contains: q.buscar } : undefined,
      fechaCompra: {
        gte: q.desde ? new Date(q.desde) : undefined,
        lte: q.hasta ? new Date(q.hasta) : undefined,
      },
    };
    return Promise.all([
      this.prisma.compra.findMany({
        where,
        include: compraInclude,
        ...this.paginar(q),
        orderBy: { fechaCompra: 'desc' },
      }),
      this.prisma.compra.count({ where }),
    ]).then(([compras, total]) => ({
      data: compras.map((compra) => this.compraConSaldo(compra)),
      total,
      pagina: q.pagina,
      limite: q.limite,
    }));
  }

  async obtenerCompra(
    idCompra: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
  ) {
    const compra = await db.compra.findUnique({
      where: { idCompra },
      include: compraInclude,
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    await this.validarSucursal(compra.idSucursal, actor, db, false);
    return this.compraConSaldo(compra);
  }

  private async crearPercepcionTx(
    db: Db,
    compra: { idCompra: number; idSucursal: number },
    dto: CrearPercepcionInput,
    actor: UsuarioAutenticado,
  ) {
    if (dto.idSucursal !== compra.idSucursal) {
      throw new BadRequestException(
        'La percepción debe registrarse en la sucursal de la compra',
      );
    }
    const montoCalculado = this.dinero(
      this.decimal(dto.baseCalculo).times(dto.porcentaje).dividedBy(100),
    );
    if (!montoCalculado.eq(dto.monto)) {
      throw new BadRequestException(
        'El monto de la percepción debe ser igual a la base por el porcentaje',
      );
    }
    if (!this.dinero(this.sumarPagos(dto.pagos)).eq(dto.monto)) {
      throw new BadRequestException(
        'La suma de los pagos debe coincidir con el monto de la percepción',
      );
    }
    const egreso = await this.crearEgresoTx(
      db,
      {
        idCaja: dto.idCaja,
        idSucursal: dto.idSucursal,
        idMotivoEgreso: MOTIVO_EGRESO_PERCEPCION,
        monto: dto.monto,
        detalle: `Percepción de la compra #${compra.idCompra}`,
        fechaEgreso: `${dto.fechaPercepcion}T00:00:00.000Z`,
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
        numeroConstancia: dto.numeroConstancia ?? null,
      },
    });
  }

  crearCompra(dto: CompraInput, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(async (tx) => {
      await this.obtenerCajaAbierta(tx, dto.idCaja, dto.idSucursal, actor);

      const totalDetalles = this.dinero(
        dto.detalles.reduce(
          (total, detalle) =>
            total.plus(
              this.decimal(detalle.cantidad).times(detalle.precioUnitario),
            ),
          new Prisma.Decimal(0),
        ),
      );
      if (!totalDetalles.eq(dto.total)) {
        throw new BadRequestException(
          'El total de la compra debe coincidir con sus detalles',
        );
      }
      if (
        dto.subtotal != null &&
        dto.igv != null &&
        !this.dinero(this.decimal(dto.subtotal).plus(dto.igv)).eq(dto.total)
      ) {
        throw new BadRequestException(
          'El total debe ser igual al subtotal más el IGV',
        );
      }
      if (this.dinero(this.sumarPagos(dto.pagos)).gt(dto.total)) {
        throw new BadRequestException(
          'La suma de los pagos no puede superar el total de la compra',
        );
      }

      await tx.$queryRaw`SELECT id_almacen FROM almacenes WHERE id_almacen = ${dto.idAlmacen} FOR UPDATE`;
      const almacen = await tx.almacen.findUnique({
        where: { idAlmacen: dto.idAlmacen },
      });
      if (!almacen) throw new BadRequestException('Almacén no encontrado');
      if (almacen.idSucursal !== dto.idSucursal) {
        throw new BadRequestException(
          'El almacén no pertenece a la sucursal seleccionada',
        );
      }
      if (!almacen.estado) {
        throw new BadRequestException('El almacén está inactivo');
      }

      let nombreProveedor = dto.nombreProveedor;
      if (dto.idProveedor != null) {
        const proveedor = await tx.proveedor.findUnique({
          where: { idProveedor: dto.idProveedor },
        });
        if (!proveedor) {
          throw new BadRequestException('Proveedor no encontrado');
        }
        if (!proveedor.activo) {
          throw new BadRequestException('El proveedor está inactivo');
        }
        nombreProveedor = proveedor.nombre;
      }

      if (dto.comprobante) {
        const tipoComprobante = await tx.tipoComprobante.findUnique({
          where: {
            idTipoComprobante: dto.comprobante.idTipoComprobante,
          },
        });
        if (!tipoComprobante) {
          throw new BadRequestException('Tipo de comprobante no encontrado');
        }
      }

      const compra = await tx.compra.create({
        data: {
          idProveedor: dto.idProveedor ?? null,
          nombreProveedor,
          idSucursal: dto.idSucursal,
          idAlmacen: dto.idAlmacen,
          idUsuario: actor.idUsuario,
          fechaCompra: this.fecha(dto.fechaCompra),
          subtotal: dto.subtotal ?? null,
          igv: dto.igv ?? null,
          total: dto.total,
          ...(dto.comprobante
            ? {
                comprobante: {
                  create: {
                    idTipoComprobante: dto.comprobante.idTipoComprobante,
                    serie: dto.comprobante.serie ?? null,
                    numero: dto.comprobante.numero ?? null,
                    fechaEmision: new Date(dto.comprobante.fechaEmision),
                  },
                },
              }
            : {}),
        },
      });

      const detalles = [...dto.detalles].sort(
        (a, b) => a.idProductoSucursal - b.idProductoSucursal,
      );
      for (const detalle of detalles) {
        await this.validarLineaInventario(
          tx,
          detalle.idProductoSucursal,
          dto.idAlmacen,
          dto.idSucursal,
        );
        const compraDetalle = await tx.compraDetalle.create({
          data: {
            idCompra: compra.idCompra,
            idProductoSucursal: detalle.idProductoSucursal,
            cantidad: detalle.cantidad,
            precioUnitario: detalle.precioUnitario,
          },
        });
        await this.aplicarMovimientoInventario(
          tx,
          {
            idProductoSucursal: detalle.idProductoSucursal,
            idAlmacen: dto.idAlmacen,
            idSucursal: dto.idSucursal,
            cantidad: detalle.cantidad,
            naturaleza: 'ENTRADA',
            idCompraDetalle: compraDetalle.idCompraDetalle,
            observacion: `Compra #${compra.idCompra}`,
          },
          actor,
        );
        await tx.productoSucursal.update({
          where: { idProductoSucursal: detalle.idProductoSucursal },
          data: {
            precioCompra: this.dinero(this.decimal(detalle.precioUnitario)),
          },
        });
      }

      if (dto.pagos.length > 0) {
        const monto = this.dinero(this.sumarPagos(dto.pagos)).toFixed(2);
        await this.crearEgresoTx(
          tx,
          {
            idCaja: dto.idCaja,
            idSucursal: dto.idSucursal,
            idMotivoEgreso: MOTIVO_EGRESO_COMPRA,
            monto,
            detalle: `Pago inicial de la compra #${compra.idCompra}`,
            fechaEgreso: dto.fechaCompra,
            pagos: dto.pagos,
          },
          actor,
          { idCompra: compra.idCompra },
        );
      }

      if (dto.percepcion) {
        await this.crearPercepcionTx(
          tx,
          { idCompra: compra.idCompra, idSucursal: compra.idSucursal },
          {
            ...dto.percepcion,
            idCaja: dto.idCaja,
            idSucursal: dto.idSucursal,
          },
          actor,
        );
      }

      return {
        message: 'Compra registrada correctamente',
        compra: await this.obtenerCompra(compra.idCompra, actor, tx),
      };
    });
  }

  registrarPagoCompra(
    idCompra: number,
    dto: PagoCompraInput,
    actor: UsuarioAutenticado,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_compra FROM compras WHERE id_compra = ${idCompra} FOR UPDATE`;
      const compra = await tx.compra.findUnique({ where: { idCompra } });
      if (!compra) throw new NotFoundException('Compra no encontrada');
      await this.validarSucursal(compra.idSucursal, actor, tx, false);
      if (dto.idSucursal !== compra.idSucursal) {
        throw new BadRequestException(
          'El pago debe registrarse en la sucursal de la compra',
        );
      }

      const monto = this.dinero(this.sumarPagos(dto.pagos));
      if (dto.monto !== undefined && !monto.eq(dto.monto)) {
        throw new BadRequestException(
          'La suma de los pagos debe coincidir con el monto pagado',
        );
      }
      const acumulado = await tx.egreso.aggregate({
        where: {
          idCompra,
          idMotivoEgreso: MOTIVO_EGRESO_COMPRA,
        },
        _sum: { monto: true },
      });
      const pagado = acumulado._sum.monto ?? new Prisma.Decimal(0);
      if (pagado.plus(monto).gt(compra.total)) {
        throw new ConflictException(
          'El pago supera el saldo pendiente de la compra',
        );
      }

      const egreso = await this.crearEgresoTx(
        tx,
        {
          ...dto,
          monto: monto.toFixed(2),
          idMotivoEgreso: MOTIVO_EGRESO_COMPRA,
          detalle: dto.detalle ?? `Pago de la compra #${idCompra}`,
        },
        actor,
        { idCompra },
      );
      return {
        message: 'Pago de compra registrado correctamente',
        egreso: await this.obtenerEgreso(egreso.idEgreso, actor, tx),
        compra: await this.obtenerCompra(idCompra, actor, tx),
      };
    });
  }

  registrarPercepcionCompra(
    idCompra: number,
    dto: CrearPercepcionInput,
    actor: UsuarioAutenticado,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_compra FROM compras WHERE id_compra = ${idCompra} FOR UPDATE`;
      const compra = await tx.compra.findUnique({ where: { idCompra } });
      if (!compra) throw new NotFoundException('Compra no encontrada');
      await this.validarSucursal(compra.idSucursal, actor, tx, false);
      const percepcion = await this.crearPercepcionTx(tx, compra, dto, actor);
      return {
        message: 'Percepción registrada correctamente',
        percepcion,
        compra: await this.obtenerCompra(idCompra, actor, tx),
      };
    });
  }

  private deudaConSaldo<
    T extends {
      fechaVencimiento: Date | null;
      egreso: { monto: Prisma.Decimal };
      abonos: Array<{ ingresoAbono: { monto: Prisma.Decimal } }>;
    },
  >(deuda: T) {
    const montoAbonado = this.dinero(
      deuda.abonos.reduce(
        (total, abono) => total.plus(abono.ingresoAbono.monto),
        new Prisma.Decimal(0),
      ),
    );
    const saldoPendiente = this.dinero(deuda.egreso.monto.minus(montoAbonado));
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
        idSucursal: this.sucursales(q, actor),
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
    await this.validarSucursal(
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
      await this.validarSucursal(
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
      const monto = this.decimal(dto.monto);
      if (saldo.lte(0)) {
        throw new ConflictException('La deuda ya está pagada');
      }
      if (monto.gt(saldo)) {
        throw new ConflictException(
          'El abono supera el saldo pendiente de la deuda',
        );
      }

      const ingreso = await this.crearIngresoTx(
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
