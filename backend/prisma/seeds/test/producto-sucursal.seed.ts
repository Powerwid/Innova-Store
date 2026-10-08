import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { idRequerido } from '../contexto-test.js';
import { productosTest } from './productos.seed.js';
export async function seedProductoSucursalTest(
  prisma: PrismaClient,
  idSucursal: number,
  productos: Map<string, number>,
) {
  const ids = new Map<string, number>();
  for (const item of productosTest.filter((item) => !item.sinAsignar)) {
    const idProducto = idRequerido(productos, item.nombre);
    const row = await prisma.productoSucursal.upsert({
      where: { idProducto_idSucursal: { idProducto, idSucursal } },
      create: {
        idProducto,
        idSucursal,
        precioCompra: item.precioCompra,
        precioVenta: item.precioVenta,
        estado: item.estadoSucursal,
      },
      update: {},
    });
    ids.set(item.nombre, row.idProductoSucursal);
  }
  return ids;
}
