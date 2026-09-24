import { prisma } from '../cliente-prisma.js';
import { PERMISOS_SISTEMA } from '../../../src/common/constants/permisos-sistema.js';

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

    // El catalogo del codigo es la unica fuente de permisos del sistema.
    await tx.permiso.deleteMany({
      where: { nombre: { notIn: nombresVigentes } },
    });
  });

  console.log('Permisos internos sincronizados');
}
