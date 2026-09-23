import { prisma } from '../cliente-prisma.js';

export async function seedRoles() {
  const roles = [
    'SUPERADMIN',
    'ADMIN',
  ];

  for (const nombre of roles) {
    await prisma.rol.upsert({
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

  console.log('Roles creados');
}