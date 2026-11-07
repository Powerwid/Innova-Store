import type { PrismaClient } from '../../../src/generated/prisma/client.js';
export const categoriasTest = [
  { nombre: 'Abarrotes', color: '#C79136' },
  { nombre: 'Frescos', color: '#D46B62' },
  { nombre: 'Panadería', color: '#B98055' },
  { nombre: 'Ferretería', color: '#667E9B' },
  { nombre: 'Verduras', color: '#39834B' },
  { nombre: 'Frutas', color: '#DF853B' },
  { nombre: 'Lácteos', color: '#4286AB' },
  { nombre: 'Huevos', color: '#C59C53' },
  { nombre: 'Pescados', color: '#3A8C95' },
  { nombre: 'Bebidas', color: '#426FC0' },
  { nombre: 'Conservas', color: '#BA7453' },
  { nombre: 'Congelados', color: '#549EBD' },
  { nombre: 'Limpieza', color: '#5C9C80' },
  { nombre: 'Cuidado personal', color: '#9564A5' },
  { nombre: 'Snacks', color: '#C25577' },
] as const;
export async function seedCategoriasTest(prisma: PrismaClient) {
  const ids = new Map<string, number>();
  for (const item of categoriasTest) {
    const nombre = item.nombre;
    const row = await prisma.categoria.upsert({
      where: { nombre },
      create: { nombre, color: item.color },
      update: {},
    });
    ids.set(item.nombre, row.idCategoria);
  }
  return ids;
}
