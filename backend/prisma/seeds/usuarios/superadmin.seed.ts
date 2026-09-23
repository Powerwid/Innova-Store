import { hash } from 'bcryptjs';
import { prisma } from '../cliente-prisma.js';

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
      nombre: 'SUPERADMIN',
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

  if (usuario) {
    const yaEsSuperadmin = await prisma.usuarioRol.findUnique({
      where: {
        idUsuario_idRol: {
          idUsuario: usuario.idUsuario,
          idRol: rolSuperadmin.idRol,
        },
      },
    });
    if (!yaEsSuperadmin) {
      throw new Error('El correo configurado ya pertenece a otra cuenta');
    }
  }

  if (!usuario) {
    const contrasenaHash = await hash(contrasena, 10);

    usuario = await prisma.usuario.create({
      data: {
        correo,
        contrasena: contrasenaHash,
        idEstado: estadoActivo.idEstado,
      },
    });
  }

  await prisma.usuarioRol.upsert({
    where: {
      idUsuario_idRol: {
        idUsuario: usuario.idUsuario,
        idRol: rolSuperadmin.idRol,
      },
    },
    update: {},
    create: {
      idUsuario: usuario.idUsuario,
      idRol: rolSuperadmin.idRol,
    },
  });

  console.log('Superadministrador creado');
}
