import { prisma } from '../cliente-prisma.js';
import { PERMISOS_SISTEMA } from '../../../src/common/constants/permisos-sistema.js';

const PERMISOS_ANTERIORES_POR_NUEVO: Record<string, string[]> = {
  USUARIOS_VER: [
    'USUARIOS_VER',
    'USUARIOS_CREAR',
    'USUARIOS_EDITAR',
    'USUARIOS_ACTIVAR',
    'USUARIOS_DESACTIVAR',
    'USUARIOS_ASIGNAR_SUCURSALES',
  ],
  USUARIOS_GESTIONAR: [
    'USUARIOS_CREAR',
    'USUARIOS_EDITAR',
    'USUARIOS_ACTIVAR',
    'USUARIOS_DESACTIVAR',
    'USUARIOS_ASIGNAR_SUCURSALES',
  ],
  SUCURSALES_VER: [
    'SUCURSALES_VER',
    'SUCURSALES_CREAR',
    'SUCURSALES_EDITAR',
    'SUCURSALES_ACTIVAR',
    'SUCURSALES_DESACTIVAR',
  ],
  SUCURSALES_GESTIONAR: [
    'SUCURSALES_CREAR',
    'SUCURSALES_EDITAR',
    'SUCURSALES_ACTIVAR',
    'SUCURSALES_DESACTIVAR',
  ],
  MEDIOS_PAGO_VER: [
    'MEDIOS_PAGO_VER',
    'MEDIOS_PAGO_CREAR',
    'MEDIOS_PAGO_EDITAR',
    'MEDIOS_PAGO_ELIMINAR',
  ],
  MEDIOS_PAGO_GESTIONAR: [
    'MEDIOS_PAGO_CREAR',
    'MEDIOS_PAGO_EDITAR',
    'MEDIOS_PAGO_ELIMINAR',
  ],
  PERSONAS_VER: [
    'PERSONAS_VER',
    'CLIENTES_CREAR',
    'CLIENTES_EDITAR',
    'CLIENTES_ELIMINAR',
    'PROVEEDORES_CREAR',
    'PROVEEDORES_EDITAR',
    'PROVEEDORES_ELIMINAR',
  ],
  PERSONAS_GESTIONAR: [
    'CLIENTES_CREAR',
    'CLIENTES_EDITAR',
    'CLIENTES_ELIMINAR',
    'PROVEEDORES_CREAR',
    'PROVEEDORES_EDITAR',
    'PROVEEDORES_ELIMINAR',
  ],
};

export async function seedPermisos() {
  const nombresVigentes = PERMISOS_SISTEMA.map(({ nombre }) => nombre);

  await prisma.$transaction(async (tx) => {
    for (const nombre of nombresVigentes) {
      await tx.permiso.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      });
    }

    // Conserva los accesos de cada rol al reemplazar permisos demasiado
    // específicos por un permiso general de gestión por módulo.
    for (const [nombreNuevo, nombresAnteriores] of Object.entries(PERMISOS_ANTERIORES_POR_NUEVO)) {
      const nuevo = await tx.permiso.findUnique({ where: { nombre: nombreNuevo } });
      const anteriores = await tx.permiso.findMany({
        where: { nombre: { in: nombresAnteriores.filter((nombre) => nombre !== nombreNuevo) } },
        select: { idPermiso: true },
      });
      if (!nuevo || anteriores.length === 0) continue;

      const asignaciones = await tx.rolPermiso.findMany({
        where: { idPermiso: { in: anteriores.map(({ idPermiso }) => idPermiso) } },
        select: { idRol: true },
        distinct: ['idRol'],
      });
      if (asignaciones.length > 0) {
        await tx.rolPermiso.createMany({
          data: asignaciones.map(({ idRol }) => ({ idRol, idPermiso: nuevo.idPermiso })),
          skipDuplicates: true,
        });
      }
    }

    // El catalogo del codigo es la unica fuente de permisos del sistema.
    await tx.permiso.deleteMany({
      where: { nombre: { notIn: nombresVigentes } },
    });
  });

  console.log('Permisos internos sincronizados');
}
