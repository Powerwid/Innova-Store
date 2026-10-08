import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { UsuarioAutenticado } from '../../src/common/types/usuario-autenticado.js';

export const PREFIJO_TEST = 'DEMO LOG - ';
export async function obtenerContextoTest(prisma: PrismaClient) {
  const correo = process.env.ADMIN_CORREO?.trim().toLowerCase();
  if (!correo)
    throw new Error('Configura ADMIN_CORREO y ejecuta primero el seed normal.');
  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: {
      rol: true,
      estado: true,
      sucursales: {
        include: { sucursal: true },
        orderBy: { idSucursal: 'asc' },
      },
    },
  });
  if (
    !usuario ||
    usuario.rol.nombre !== 'ADMIN' ||
    usuario.estado.nombre !== 'ACTIVO'
  )
    throw new Error('Se necesita el usuario ADMIN activo del seed normal.');
  const disponibles = usuario.sucursales
    .map((item) => item.sucursal)
    .filter((item) => item.activo);
  const sucursal =
    disponibles.find((item) => item.nombre === 'Sucursal Principal') ??
    disponibles[0];
  if (!sucursal)
    throw new Error('El ADMIN necesita una sucursal activa asignada.');
  const actor: UsuarioAutenticado = {
    idUsuario: usuario.idUsuario,
    correo: usuario.correo,
    estado: usuario.estado.nombre,
    rol: { idRol: usuario.idRol, nombre: usuario.rol.nombre },
    permisos: [],
    sucursales: [sucursal.idSucursal],
  };
  return { actor, sucursal };
}
export function idRequerido(ids: Map<string, number>, nombre: string): number {
  const id = ids.get(nombre);
  if (!id) throw new Error(`Falta la dependencia del seed: ${nombre}`);
  return id;
}
