import { prisma } from '../cliente-prisma.js';

export async function seedTiposDocumento() {
  const tiposDocumento = [
    'DNI',
    'RUC',
    'CE',
  ];

  for (const nombre of tiposDocumento) {
    await prisma.tipoDocumento.upsert({
      where: {
        nombre,
      },
      update: {},
      create: {
        nombre,
        activo: true,
      },
    });
  }

  console.log('Tipos de documento creados');
}