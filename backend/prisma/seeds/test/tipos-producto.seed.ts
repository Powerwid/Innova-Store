import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { PREFIJO_TEST } from '../contexto-test.js';
export const tiposProductoTest = [
  'Mercadería',
  'Fresco',
  'Refrigerado',
  'Congelado',
  'Hogar',
  'Higiene',
] as const;
export async function seedTiposProductoTest(prisma: PrismaClient) {
  const ids = new Map<string, number>();
  for (const nombre of tiposProductoTest) {
    const row = await prisma.tipoProducto.upsert({
      where: { nombre: PREFIJO_TEST + nombre },
      create: { nombre: PREFIJO_TEST + nombre },
      update: {},
    });
    ids.set(nombre, row.idTipoProducto);
  }
  return ids;
}
