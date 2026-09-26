import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PERMISOS_SISTEMA_POR_NOMBRE } from '../../../common/constants/permisos-sistema.js';
import { PermisoSistema } from '../../../common/enums/permiso-sistema.enum.js';
import { RolSistema } from '../../../common/enums/rol-sistema.enum.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { CrearRolDto } from './dto/acceso.dto.js';

const rolDetalleSelect = {
  idRol: true,
  nombre: true,
  permisos: {
    select: {
      permiso: { select: { idPermiso: true, nombre: true } },
    },
  },
  _count: { select: { usuarios: true, permisos: true } },
} as const;

interface PermisoRegistro {
  idPermiso: number;
  nombre: string;
}

interface RolRegistro {
  idRol: number;
  nombre: string;
  permisos: Array<{ permiso: PermisoRegistro }>;
  _count: { usuarios: number; permisos: number };
}

@Injectable()
export class AccesoService {
  constructor(private readonly prisma: PrismaService) { }

  async listarRoles() {
    const roles = await this.prisma.rol.findMany({
      where: { nombre: { not: RolSistema.SUPERADMIN } },
      select: rolDetalleSelect,
      orderBy: { nombre: 'asc' },
    });

    return roles.map((rol) => this.presentarRol(rol));
  }

  async crearRol(dto: CrearRolDto) {
    this.validarNombreReservado(dto.nombre);

    const existente = await this.prisma.rol.findUnique({ where: { nombre: dto.nombre } });
    if (existente) throw new ConflictException('El rol ya existe');

    const rol = await this.prisma.rol.create({
      data: { nombre: dto.nombre },
      select: rolDetalleSelect,
    });

    return {
      message: 'Rol creado correctamente',
      rol: this.presentarRol(rol),
    };
  }

  async eliminarRol(idRol: number) {
    return this.prisma.$transaction(async (tx) => {
      const rol = await tx.rol.findUnique({
        where: { idRol },
        select: {
          idRol: true,
          nombre: true,
          _count: { select: { usuarios: true } },
        },
      });

      if (!rol) throw new NotFoundException('Rol no encontrado');
      this.validarRolReservado(rol.nombre);

      if (rol._count.usuarios > 0) {
        throw new ConflictException(
          `No se puede eliminar el rol porque tiene ${rol._count.usuarios} usuario(s) asignado(s)`,
        );
      }

      await tx.rol.delete({ where: { idRol } });

      return {
        message: 'Rol eliminado correctamente',
        rol: { idRol: rol.idRol, nombre: rol.nombre },
      };
    }, { isolationLevel: 'Serializable' });
  }

  async listarPermisos() {
    const permisos = await this.prisma.permiso.findMany({
      select: { idPermiso: true, nombre: true },
    });

    return permisos
      .map((permiso) => this.presentarPermiso(permiso))
      .sort((a, b) => a.orden - b.orden || a.etiqueta.localeCompare(b.etiqueta));
  }

  async sincronizarPermisos(idRol: number, idsPermisos: number[]) {
    return this.prisma.$transaction(async (tx) => {
      const rol = await tx.rol.findUnique({
        where: { idRol },
        select: { idRol: true, nombre: true },
      });

      if (!rol) throw new NotFoundException('Rol no encontrado');
      this.validarRolReservado(rol.nombre);

      const permisos = idsPermisos.length === 0
        ? []
        : await tx.permiso.findMany({
          where: { idPermiso: { in: idsPermisos } },
          select: { idPermiso: true },
        });

      if (permisos.length !== idsPermisos.length) {
        const encontrados = new Set(permisos.map(({ idPermiso }) => idPermiso));
        const inexistentes = idsPermisos.filter((idPermiso) => !encontrados.has(idPermiso));
        throw new NotFoundException(
          `No existen los permisos con identificadores: ${inexistentes.join(', ')}`,
        );
      }

      await tx.rolPermiso.deleteMany({ where: { idRol } });

      if (idsPermisos.length > 0) {
        await tx.rolPermiso.createMany({
          data: idsPermisos.map((idPermiso) => ({ idRol, idPermiso })),
        });
      }

      const actualizado = await tx.rol.findUnique({
        where: { idRol },
        select: rolDetalleSelect,
      });

      if (!actualizado) throw new NotFoundException('Rol no encontrado');

      return {
        message: 'Permisos del rol actualizados correctamente',
        rol: this.presentarRol(actualizado),
      };
    }, { isolationLevel: 'Serializable' });
  }

  private presentarRol(rol: RolRegistro) {
    const permisos = rol.permisos
      .map(({ permiso }) => this.presentarPermiso(permiso))
      .sort((a, b) => a.orden - b.orden || a.etiqueta.localeCompare(b.etiqueta));

    return {
      idRol: rol.idRol,
      nombre: rol.nombre,
      cantidadUsuarios: rol._count.usuarios,
      cantidadPermisos: rol._count.permisos,
      permisos,
    };
  }

  private presentarPermiso(permiso: PermisoRegistro) {
    const definicion = PERMISOS_SISTEMA_POR_NOMBRE.get(
      permiso.nombre as PermisoSistema,
    );

    return {
      idPermiso: permiso.idPermiso,
      nombre: permiso.nombre,
      etiqueta: definicion?.etiqueta ?? permiso.nombre,
      modulo: definicion?.modulo ?? 'Sistema',
      orden: definicion?.orden ?? Number.MAX_SAFE_INTEGER,
    };
  }

  private validarNombreReservado(nombre: string) {
    if (nombre === RolSistema.SUPERADMIN) {
      throw new ForbiddenException('SUPERADMIN es un rol reservado');
    }
  }

  private validarRolReservado(nombre: string) {
    this.validarNombreReservado(nombre);
  }
}
