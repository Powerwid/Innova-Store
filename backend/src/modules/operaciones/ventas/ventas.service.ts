import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { MovimientosCajaService } from '../cajas/movimientos-caja.service.js';
import { InventarioOperacionesService } from '../compartido/inventario-operaciones.service.js';
import { MOTIVO_EGRESO_CREDITO_CLIENTE, MOTIVO_INGRESO_VENTA } from '../compartido/operaciones.constants.js';
import { ingresoInclude } from '../compartido/operaciones.selects.js';
import type { ConsultaPaginada, Db } from '../compartido/operaciones.types.js';
import { decimal, dinero, pagina, paginar, sucursales, sumarPagos } from '../compartido/operaciones.utils.js';
import { construirTicketVenta, validarEfectivoTicket } from './ticket-venta.js';
import type { VentaInput } from './ventas.types.js';

@Injectable()
export class VentasService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MovimientosCajaService)
    private readonly movimientos: MovimientosCajaService,
    @Inject(InventarioOperacionesService)
    private readonly inventario: InventarioOperacionesService,
  ) { }

  listarVentas(q: ConsultaPaginada, actor: UsuarioAutenticado) {
    const where: Prisma.IngresoWhereInput = {
      idSucursal: sucursales(q, actor),
      idCaja: q.idCaja,
      idMotivoIngreso: MOTIVO_INGRESO_VENTA,
      productos: { some: {} },
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

  async obtenerVenta(
    idVenta: number,
    actor: UsuarioAutenticado,
    db: Db = this.prisma,
  ) {
    const venta = await this.movimientos.obtenerIngreso(idVenta, actor, db);
    if (
      venta.idMotivoIngreso !== MOTIVO_INGRESO_VENTA ||
      venta.productos.length === 0
    ) {
      throw new NotFoundException('Venta no encontrada');
    }
    return venta;
  }

  async crearVenta(dto: VentaInput, actor: UsuarioAutenticado) {
    const huella = createHash('sha256')
      .update(
        JSON.stringify({
          idCaja: dto.idCaja,
          idSucursal: dto.idSucursal,
          monto: decimal(dto.monto).toFixed(2),
          detalle: dto.detalle || null,
          fechaIngreso: dto.fechaIngreso || null,
          credito: dto.credito || null,
          ...(dto.idCliente !== undefined ? { idCliente: dto.idCliente } : {}),
          ...(dto.efectivoRecibido !== undefined
            ? {
              efectivoRecibido: decimal(dto.efectivoRecibido).toFixed(2),
            }
            : {}),
          productos: [...dto.productos]
            .sort(
              (a, b) =>
                a.idProductoSucursal - b.idProductoSucursal ||
                a.idAlmacen - b.idAlmacen,
            )
            .map((p) => ({
              ...p,
              cantidad: decimal(p.cantidad).toFixed(3),
              precioUnitario: decimal(p.precioUnitario).toFixed(4),
            })),
          pagos: [...dto.pagos]
            .sort((a, b) => a.idMedioPago - b.idMedioPago)
            .map((p) => ({ ...p, monto: decimal(p.monto).toFixed(2) })),
        }),
      )
      .digest('hex');
    const recuperar = async (db: Db) => {
      if (!dto.claveOperacion) return null;
      const existente = await db.ingreso.findUnique({
        where: { claveOperacion: dto.claveOperacion },
      });
      if (!existente) return null;
      if (
        existente.idUsuario !== actor.idUsuario ||
        existente.huellaOperacion !== huella
      )
        throw new ConflictException(
          'Esta operación ya fue registrada con otros datos. Revisa el historial de ventas.',
        );
      return {
        message: 'Venta registrada correctamente',
        venta: await this.obtenerVenta(existente.idIngreso, actor, db),
      };
    };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const anterior = await recuperar(tx);
        if (anterior) return anterior;
        const totalProductos = dinero(
          dto.productos.reduce(
            (total, producto) =>
              total.plus(
                decimal(producto.cantidad).times(producto.precioUnitario),
              ),
            new Prisma.Decimal(0),
          ),
        );
        const totalVenta = decimal(dto.monto);
        if (!totalProductos.eq(totalVenta)) {
          throw new BadRequestException(
            'El total de la venta debe coincidir con sus productos',
          );
        }

        const montoPagado = dinero(sumarPagos(dto.pagos));
        const saldoCredito = dinero(totalVenta.minus(montoPagado));
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

        if (
          dto.credito &&
          dto.idCliente &&
          dto.idCliente !== dto.credito.idCliente
        ) {
          throw new BadRequestException(
            'El cliente de la venta debe coincidir con el cliente del pago pendiente',
          );
        }
        const idCliente = dto.idCliente ?? dto.credito?.idCliente;
        const clienteVenta = idCliente
          ? await tx.cliente.findUnique({ where: { idCliente } })
          : await tx.cliente.findFirst({
            where: { esGenerico: true, activo: true },
          });
        if (idCliente && (!clienteVenta || !clienteVenta.activo))
          throw new BadRequestException('Cliente activo no encontrado');
        if (dto.credito && clienteVenta?.esGenerico)
          throw new BadRequestException(
            'Selecciona un cliente identificado para dejar un pago pendiente',
          );
        if (dto.efectivoRecibido !== undefined) {
          const medios = await tx.medioPago.findMany({
            where: { idMedioPago: { in: dto.pagos.map((p) => p.idMedioPago) } },
          });
          const cashIds = new Set(
            medios
              .filter((m) => m.nombre.trim().toLowerCase() === 'efectivo')
              .map((m) => m.idMedioPago),
          );
          const efectivo = dto.pagos
            .filter((p) => cashIds.has(p.idMedioPago))
            .reduce((sum, p) => sum.plus(p.monto), new Prisma.Decimal(0));
          validarEfectivoTicket(dto.efectivoRecibido, efectivo);
        }
        const ingreso = await this.movimientos.crearIngresoTx(
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
        if (clienteVenta)
          await tx.ingreso.update({
            where: { idIngreso: ingreso.idIngreso },
            data: { idCliente: clienteVenta.idCliente },
          });
        if (dto.claveOperacion)
          await tx.ingreso.update({
            where: { idIngreso: ingreso.idIngreso },
            data: {
              claveOperacion: dto.claveOperacion,
              huellaOperacion: huella,
            },
          });
        for (const producto of productos) {
          await this.inventario.validarLineaInventario(
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
          await this.inventario.aplicarMovimientoInventario(
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
          const egreso = await this.movimientos.crearEgresoTx(
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

        const venta = await this.obtenerVenta(ingreso.idIngreso, actor, tx);
        const perfil = await tx.sucursalPerfil.findUnique({
          where: { idSucursal: dto.idSucursal },
          include: { tipoDocumento: true },
        });
        const ticketDatos = construirTicketVenta(
          venta,
          perfil,
          dto.efectivoRecibido,
        );
        await tx.ingreso.update({
          where: { idIngreso: ingreso.idIngreso },
          data: { ticketDatos },
        });
        return {
          message: 'Venta registrada correctamente',
          venta: { ...venta, ticketDatos },
        };
      });
    } catch (cause) {
      // Dos solicitudes simultáneas compiten por la misma clave; solo una confirma.
      if (
        dto.claveOperacion &&
        cause instanceof Prisma.PrismaClientKnownRequestError &&
        cause.code === 'P2002'
      ) {
        const anterior = await recuperar(this.prisma);
        if (anterior) return anterior;
      }
      throw cause;
    }
  }
}
