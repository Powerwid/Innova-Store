import { prisma } from '../cliente-prisma.js';

export async function seedPermisos() {
  const permisos = [
    'USUARIOS_VER',
    'USUARIOS_CREAR',
    'USUARIOS_EDITAR',
    'USUARIOS_ELIMINAR',

    'ROLES_VER',
    'ROLES_CREAR',
    'ROLES_EDITAR',

    'PERMISOS_VER',
    'PERMISOS_ASIGNAR',

    'SUCURSALES_VER',
    'SUCURSALES_CREAR',
    'SUCURSALES_EDITAR',
  ];

  for (const nombre of permisos) {
    await prisma.permiso.upsert({
      where: {
        nombre,
      },
      update: {},
      create: {
        nombre,
      },
    });
  }

  console.log('Permisos creados');
}
