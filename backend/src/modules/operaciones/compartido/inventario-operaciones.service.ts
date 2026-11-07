import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import {
  CONFIG_STOCK_NEGATIVO,
  MOVIMIENTO_COMPRA,
  MOVIMIENTO_VENTA,
} from '../../logistica/logistica.constants.js';
import { type Db } from './operaciones.types.js';
import { decimal } from './operaciones.utils.js';

@Injectable()
export class InventarioOperacionesService {
  constructor() {}

  async validarLineaInventario(
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

  async aplicarMovimientoInventario(
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

    const cantidad = decimal(data.cantidad);
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
}
