import { prisma } from '../cliente-prisma.js';

export async function seedEstados() {
  const estados = [
    'ACTIVO',
    'INACTIVO',
    'BLOQUEADO',
  ];

  for (const nombre of estados) {
    await prisma.estado.upsert({
      where: {
        nombre,
      },
      update: {},
      create: {
        nombre,
      },
    });
  }

  console.log('Estados creados');
}