import { prisma } from '../cliente-prisma.js';
import { RolSistema } from '../../../src/common/enums/rol-sistema.enum.js';

export async function seedRolesPermisos() {
  const superadmin = await prisma.rol.findUnique({
    where: {
      nombre: RolSistema.SUPERADMIN,
    },
  });

  if (!superadmin) {
    throw new Error('No existe el rol SUPERADMIN');
  }

  // SUPERADMIN recibe automaticamente cada permiso definido internamente.
  // Los demas roles son configurados exclusivamente desde la administracion.
  const permisos = await prisma.permiso.findMany();

  await prisma.$transaction(async (tx) => {
    await tx.rolPermiso.deleteMany({ where: { idRol: superadmin.idRol } });
    if (permisos.length > 0) {
      await tx.rolPermiso.createMany({
        data: permisos.map(({ idPermiso }) => ({
          idRol: superadmin.idRol,
          idPermiso,
        })),
      });
    }
  });

  console.log('Permisos internos sincronizados con SUPERADMIN');
}
