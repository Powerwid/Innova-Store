import { hash } from 'bcryptjs';
import { prisma } from '../cliente-prisma.js';

export async function seedAdminSucursal() {
  const correo = process.env.ADMIN_CORREO?.trim().toLowerCase();
  const contrasena = process.env.ADMIN_CONTRASENA;
  if (!correo || !contrasena) {
    throw new Error('ADMIN_CORREO y ADMIN_CONTRASENA no están configurados');
  }

  const [estado, rol] = await Promise.all([
    prisma.estado.findUnique({ where: { nombre: 'ACTIVO' } }),
    prisma.rol.findUnique({ where: { nombre: 'ADMIN' } }),
  ]);
  if (!estado || !rol) throw new Error('Faltan el estado ACTIVO o el rol ADMIN');

  let usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { sucursales: { select: { sucursal: true }, take: 1 } },
  });
  if (usuario && usuario.idRol !== rol.idRol) {
    throw new Error('ADMIN_CORREO ya pertenece a una cuenta con otro rol');
  }
  const nombreSucursal = 'Sucursal Principal';
  let sucursal = usuario?.sucursales[0]?.sucursal
    ?? await prisma.sucursal.findFirst({
      where: { nombre: nombreSucursal },
      orderBy: { idSucursal: 'asc' },
    });
  sucursal ??= await prisma.sucursal.create({ data: { nombre: nombreSucursal } });

  const idUsuario = usuario?.idUsuario ?? (await prisma.usuario.create({
    data: {
      correo,
      contrasena: await hash(contrasena, 10),
      idEstado: estado.idEstado,
      idRol: rol.idRol,
      perfil: { create: { nombres: 'Administrador', apellidos: 'Sucursal Principal' } },
    },
  })).idUsuario;

  await prisma.usuarioSucursal.upsert({
    where: { idUsuario_idSucursal: { idUsuario, idSucursal: sucursal.idSucursal } },
    update: {},
    create: { idUsuario, idSucursal: sucursal.idSucursal },
  });

  console.log('Administrador de sucursal preparado');
}
