import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { RolSistema } from '../enums/rol-sistema.enum.js';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';

const payloadSchema = z.object({
  sub: z.number().int().positive(),
  tipo: z.literal('access'),
});

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET no está configurado');
    super({
      jwtFromRequest: (req: Request) => {
        const cookies = req?.cookies as Record<string, unknown> | undefined;
        return typeof cookies?.access_token === 'string'
          ? cookies.access_token
          : null;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: unknown): Promise<UsuarioAutenticado> {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) throw new UnauthorizedException('Token inválido');

    const usuario = await this.prisma.usuario.findUnique({
      where: { idUsuario: parsed.data.sub },
      select: {
        idUsuario: true,
        correo: true,
        estado: { select: { nombre: true } },
        rol: {
          select: {
            idRol: true,
            nombre: true,
            permisos: { select: { permiso: { select: { nombre: true } } } },
          },
        },
        sucursales: { select: { idSucursal: true } },
      },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');
    const sucursales = usuario.rol.nombre === RolSistema.SUPERADMIN
      ? (await this.prisma.sucursal.findMany({
          where: { activo: true },
          select: { idSucursal: true },
        })).map(({ idSucursal }) => idSucursal)
      : usuario.sucursales.map(({ idSucursal }) => idSucursal);

    return {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      estado: usuario.estado.nombre,
      rol: {
        idRol: usuario.rol.idRol,
        nombre: usuario.rol.nombre,
      },
      permisos: usuario.rol.permisos.map(({ permiso }) => permiso.nombre),
      sucursales,
    };
  }
}
