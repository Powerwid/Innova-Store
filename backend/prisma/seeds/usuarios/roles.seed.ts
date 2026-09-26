import { prisma } from '../cliente-prisma.js';
import { RolSistema } from '../../../src/common/enums/rol-sistema.enum.js';

export async function seedRoles() {
  const roles = [
    RolSistema.SUPERADMIN,
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
      },
    });
  }

  console.log('Roles creados');
}
