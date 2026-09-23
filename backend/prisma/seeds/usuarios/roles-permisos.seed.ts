import { prisma } from '../cliente-prisma.js';

export async function seedRolesPermisos() {
  const superadmin = await prisma.rol.findUnique({
    where: {
      nombre: 'SUPERADMIN',
    },
  });

  const admin = await prisma.rol.findUnique({
    where: {
      nombre: 'ADMIN',
    },
  });

  if (!superadmin) {
    throw new Error('No existe el rol SUPERADMIN');
  }

  if (!admin) {
    throw new Error('No existe el rol ADMIN');
  }

  // SUPERADMIN recibe todos los permisos
  const permisos = await prisma.permiso.findMany();

  for (const permiso of permisos) {
    await prisma.rolPermiso.upsert({
      where: {
        idRol_idPermiso: {
          idRol: superadmin.idRol,
          idPermiso: permiso.idPermiso,
        },
      },
      update: {},
      create: {
        idRol: superadmin.idRol,
        idPermiso: permiso.idPermiso,
      },
    });
  }

  // ADMIN solo recibe los permisos administrativos permitidos
  const permisosAdmin = [
    'USUARIOS_VER',
    'USUARIOS_CREAR',
    'USUARIOS_EDITAR',

    'SUCURSALES_VER',
    'SUCURSALES_CREAR',
    'SUCURSALES_EDITAR',
  ];

  const permisosEncontrados = await prisma.permiso.findMany({
    where: {
      nombre: {
        in: permisosAdmin,
      },
    },
  });

  for (const permiso of permisosEncontrados) {
    await prisma.rolPermiso.upsert({
      where: {
        idRol_idPermiso: {
          idRol: admin.idRol,
          idPermiso: permiso.idPermiso,
        },
      },
      update: {},
      create: {
        idRol: admin.idRol,
        idPermiso: permiso.idPermiso,
      },
    });
  }

  console.log('Permisos asignados a los roles');
}