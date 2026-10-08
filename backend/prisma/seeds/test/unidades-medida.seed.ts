import type { PrismaClient } from '../../../src/generated/prisma/client.js';
export const unidadesMedidaTest = [
  { nombre: 'Unidad', simbolo: 'UND' },
  { nombre: 'Kilogramo', simbolo: 'KG' },
  { nombre: 'Litro', simbolo: 'L' },
  { nombre: 'Docena', simbolo: 'DOC' },
  { nombre: 'Paquete', simbolo: 'PQT' },
  { nombre: 'Caja', simbolo: 'CJA' },
  { nombre: 'Metro', simbolo: 'M' },
  { nombre: 'Par', simbolo: 'PAR' },
] as const;
export async function seedUnidadesMedidaTest(prisma: PrismaClient) {
  const ids = new Map<string, number>();
  for (const item of unidadesMedidaTest) {
    const row = await prisma.unidadMedida.upsert({
      where: { simbolo: item.simbolo },
      create: item,
      update: {},
    });
    ids.set(item.simbolo, row.idUnidadMedida);
  }
  return ids;
}
