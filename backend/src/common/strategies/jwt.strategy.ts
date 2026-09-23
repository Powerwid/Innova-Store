import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { z } from 'zod';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';

const payloadSchema = z.object({ sub: z.number().int().positive() });

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET no está configurado');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
        roles: {
          where: { rol: { activo: true } },
          select: {
            rol: {
              select: {
                nombre: true,
                permisos: { select: { permiso: { select: { nombre: true } } } },
              },
            },
          },
        },
      },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    return {
      idUsuario: usuario.idUsuario,
      correo: usuario.correo,
      estado: usuario.estado.nombre,
      roles: usuario.roles.map(({ rol }) => rol.nombre),
      permisos: [...new Set(usuario.roles.flatMap(({ rol }) =>
        rol.permisos.map(({ permiso }) => permiso.nombre),
      ))],
    };
  }
}
