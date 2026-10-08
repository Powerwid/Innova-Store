import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { PREFIJO_TEST } from '../contexto-test.js';
export async function seedAlmacenesTest(
  prisma: PrismaClient,
  idSucursal: number,
) {
  const ids = new Map<string, number>();
  for (const item of [
    { nombre: 'Mostrador', tipo: 'AREA_VENTA' },
    { nombre: 'Depósito', tipo: 'ALMACEN' },
  ] as const) {
    const nombre = PREFIJO_TEST + item.nombre;
    // El seed anterior creaba Mostrador como ALMACEN; ahora representa el área de venta.
    const row = await prisma.almacen.upsert({
      where: { idSucursal_nombre: { idSucursal, nombre } },
      create: { idSucursal, nombre, tipo: item.tipo },
      update: { tipo: item.tipo },
    });
    ids.set(item.nombre, row.idAlmacen);
  }
  return ids;
}
