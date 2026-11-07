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
import { CajasService } from '../cajas/cajas.service.js';
import { MovimientosCajaService } from '../cajas/movimientos-caja.service.js';
import { InventarioOperacionesService } from '../compartido/inventario-operaciones.service.js';
import { OperacionesAccesoService } from '../compartido/operaciones-acceso.service.js';
import { MOTIVO_EGRESO_COMPRA } from '../compartido/operaciones.constants.js';
import { compraInclude } from '../compartido/operaciones.selects.js';
import {
  type ConsultaPaginada,
  type Db,
} from '../compartido/operaciones.types.js';
import {
  decimal,
  dinero,
  fecha,
  paginar,
  sucursales,
  sumarPagos,
} from '../compartido/operaciones.utils.js';
import {
  type CompraInput,
  type CrearPercepcionInput,
  type PagoCompraInput,
} from './compras.types.js';
import { PercepcionesService } from './percepciones.service.js';

@Injectable()
export class ComprasService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OperacionesAccesoService)
    private readonly acceso: OperacionesAccesoService,
    @Inject(CajasService) private readonly cajas: CajasService,
    @Inject(MovimientosCajaService)
    private readonly movimientos: MovimientosCajaService,
    @Inject(InventarioOperacionesService)
    private readonly inventario: InventarioOperacionesService,
    @Inject(PercepcionesService)
    private readonly percepciones: PercepcionesService,
  ) {}

  private compraConSaldo<
    T extends {
      total: Prisma.Decimal;
      egresos: Array<{
        idMotivoEgreso: number;
        monto: Prisma.Decimal;
      }>;
    },
  >(compra: T) {
    const montoPagado = dinero(
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
      egresos: q.idCaja ? { some: { idCaja: q.idCaja } } : undefined,
      idSucursal: sucursales(q, actor),
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
        ...paginar(q),
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
    await this.acceso.validarSucursal(compra.idSucursal, actor, db, false);
    return this.compraConSaldo(compra);
  }

  crearCompra(dto: CompraInput, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(async (tx) => {
      await this.cajas.obtenerCajaAbierta(
        tx,
        dto.idCaja,
        dto.idSucursal,
        actor,
      );

      const totalDetalles = dinero(
        dto.detalles.reduce(
          (total, detalle) =>
            total.plus(decimal(detalle.cantidad).times(detalle.precioUnitario)),
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
        !dinero(decimal(dto.subtotal).plus(dto.igv)).eq(dto.total)
      ) {
        throw new BadRequestException(
          'El total debe ser igual al subtotal más el IGV',
        );
      }
      if (dinero(sumarPagos(dto.pagos)).gt(dto.total)) {
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
          fechaCompra: fecha(dto.fechaCompra),
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
        await this.inventario.validarLineaInventario(
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
        await this.inventario.aplicarMovimientoInventario(
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
            precioCompra: dinero(decimal(detalle.precioUnitario)),
          },
        });
      }

      if (dto.pagos.length > 0) {
        const monto = dinero(sumarPagos(dto.pagos)).toFixed(2);
        await this.movimientos.crearEgresoTx(
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
        await this.percepciones.crearPercepcionTx(
          tx,
          compra,
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
      await this.acceso.validarSucursal(compra.idSucursal, actor, tx, false);
      if (dto.idSucursal !== compra.idSucursal) {
        throw new BadRequestException(
          'El pago debe registrarse en la sucursal de la compra',
        );
      }

      const monto = dinero(sumarPagos(dto.pagos));
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

      const egreso = await this.movimientos.crearEgresoTx(
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
        egreso: await this.movimientos.obtenerEgreso(
          egreso.idEgreso,
          actor,
          tx,
        ),
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
      await this.acceso.validarSucursal(compra.idSucursal, actor, tx, false);
      const percepcion = await this.percepciones.crearPercepcionTx(
        tx,
        compra,
        dto,
        actor,
      );
      return {
        message: 'Percepción registrada correctamente',
        percepcion,
        compra: await this.obtenerCompra(idCompra, actor, tx),
      };
    });
  }
}
