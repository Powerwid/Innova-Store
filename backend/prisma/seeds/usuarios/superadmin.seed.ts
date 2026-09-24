import { hash } from 'bcryptjs';
import { prisma } from '../cliente-prisma.js';
import { RolSistema } from '../../../src/common/enums/rol-sistema.enum.js';

export async function seedSuperadmin() {
  const correo = process.env.SUPERADMIN_CORREO;
  const contrasena = process.env.SUPERADMIN_CONTRASENA;

  if (!correo || !contrasena) {
    throw new Error(
      'SUPERADMIN_CORREO y SUPERADMIN_CONTRASENA no están configurados',
    );
  }

  const estadoActivo = await prisma.estado.findUnique({
    where: {
      nombre: 'ACTIVO',
    },
  });

  if (!estadoActivo) {
    throw new Error('No existe el estado ACTIVO');
  }

  const rolSuperadmin = await prisma.rol.findUnique({
    where: {
      nombre: RolSistema.SUPERADMIN,
    },
  });

  if (!rolSuperadmin) {
    throw new Error('No existe el rol SUPERADMIN');
  }

  let usuario = await prisma.usuario.findUnique({
    where: {
      correo,
    },
  });

  if (usuario && usuario.idRol !== rolSuperadmin.idRol) {
    throw new Error('El correo configurado ya pertenece a otra cuenta');
  }

  if (!usuario) {
    const contrasenaHash = await hash(contrasena, 10);

    usuario = await prisma.usuario.create({
      data: {
        correo,
        contrasena: contrasenaHash,
        idEstado: estadoActivo.idEstado,
        idRol: rolSuperadmin.idRol,
      },
    });
  }

  console.log('Superadministrador creado');
}
