import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import type { ActualizarRolDto, CrearRolDto } from './dto/acceso.dto.js';

@Injectable()
export class AccesoService {
  constructor(private readonly prisma: PrismaService) { }

  private exigirSuperadmin(actor: UsuarioAutenticado) {
    if (actor.estado !== 'ACTIVO' || !actor.roles.includes('SUPERADMIN')) {
      throw new ForbiddenException('Solo SUPERADMIN puede administrar roles y permisos');
    }
  }

  async listarRoles(actor: UsuarioAutenticado) {
    this.exigirSuperadmin(actor);
    return this.prisma.rol.findMany({
      select: {
        idRol: true,
        nombre: true,
        activo: true,
        permisos: { select: { permiso: { select: { idPermiso: true, nombre: true } } } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async crearRol(actor: UsuarioAutenticado, dto: CrearRolDto) {
    this.exigirSuperadmin(actor);
    if (dto.nombre === 'SUPERADMIN') {
      throw new ForbiddenException('SUPERADMIN es un rol reservado');
    }
    const existente = await this.prisma.rol.findUnique({ where: { nombre: dto.nombre } });
    if (existente) throw new ConflictException('El rol ya existe');
    return this.prisma.rol.create({ data: { nombre: dto.nombre } });
  }

  async actualizarRol(actor: UsuarioAutenticado, idRol: number, dto: ActualizarRolDto) {
    this.exigirSuperadmin(actor);
    const rol = await this.prisma.rol.findUnique({ where: { idRol } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.nombre === 'SUPERADMIN' || dto.nombre === 'SUPERADMIN') {
      throw new ForbiddenException('SUPERADMIN es un rol reservado');
    }
    if (dto.nombre && dto.nombre !== rol.nombre) {
      const existente = await this.prisma.rol.findUnique({ where: { nombre: dto.nombre } });
      if (existente) throw new ConflictException('El rol ya existe');
    }
    return this.prisma.rol.update({ where: { idRol }, data: dto });
  }

  async asignarRol(actor: UsuarioAutenticado, idUsuario: number, idRol: number) {
    this.exigirSuperadmin(actor);
    const [usuario, rol] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { idUsuario }, select: { idUsuario: true } }),
      this.prisma.rol.findUnique({ where: { idRol } }),
    ]);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (!rol || !rol.activo) throw new NotFoundException('Rol activo no encontrado');
    await this.prisma.usuarioRol.upsert({
      where: { idUsuario_idRol: { idUsuario, idRol } },
      update: {},
      create: { idUsuario, idRol },
    });
    return { message: 'Rol asignado' };
  }

  async quitarRol(actor: UsuarioAutenticado, idUsuario: number, idRol: number) {
    this.exigirSuperadmin(actor);
    const rol = await this.prisma.rol.findUnique({ where: { idRol } });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    await this.prisma.$transaction(async (tx) => {
      const asignacion = await tx.usuarioRol.findUnique({
        where: { idUsuario_idRol: { idUsuario, idRol } },
      });
      if (!asignacion) throw new NotFoundException('Asignación no encontrada');
      if (rol.nombre === 'SUPERADMIN') {
        const activos = await tx.usuarioRol.count({
          where: { idRol, usuario: { estado: { nombre: 'ACTIVO' } } },
        });
        const objetivo = await tx.usuario.findUnique({
          where: { idUsuario },
          select: { estado: { select: { nombre: true } } },
        });
        if (objetivo?.estado.nombre === 'ACTIVO' && activos <= 1) {
          throw new ForbiddenException('No se puede quitar el último SUPERADMIN activo');
        }
      }
      await tx.usuarioRol.delete({ where: { idUsuario_idRol: { idUsuario, idRol } } });
    }, { isolationLevel: 'Serializable' });
    return { message: 'Rol retirado' };
  }

  async listarPermisos(actor: UsuarioAutenticado) {
    this.exigirSuperadmin(actor);
    return this.prisma.permiso.findMany({
      select: { idPermiso: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async asignarPermiso(actor: UsuarioAutenticado, idRol: number, idPermiso: number) {
    this.exigirSuperadmin(actor);
    const [rol, permiso] = await Promise.all([
      this.prisma.rol.findUnique({ where: { idRol } }),
      this.prisma.permiso.findUnique({ where: { idPermiso } }),
    ]);
    if (!rol || !rol.activo) throw new NotFoundException('Rol activo no encontrado');
    if (!permiso) throw new NotFoundException('Permiso no encontrado');
    if (rol.nombre === 'SUPERADMIN') {
      throw new ForbiddenException('SUPERADMIN no necesita asignaciones de permisos');
    }
    await this.prisma.rolPermiso.upsert({
      where: { idRol_idPermiso: { idRol, idPermiso } },
      update: {},
      create: { idRol, idPermiso },
    });
    return { message: 'Permiso asignado' };
  }

  async quitarPermiso(actor: UsuarioAutenticado, idRol: number, idPermiso: number) {
    this.exigirSuperadmin(actor);
    const rol = await this.prisma.rol.findUnique({ where: { idRol } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.nombre === 'SUPERADMIN') {
      throw new ForbiddenException('SUPERADMIN no depende de permisos asignados');
    }
    const asignacion = await this.prisma.rolPermiso.findUnique({
      where: { idRol_idPermiso: { idRol, idPermiso } },
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');
    await this.prisma.rolPermiso.delete({
      where: { idRol_idPermiso: { idRol, idPermiso } },
    });
    return { message: 'Permiso retirado' };
  }
}
