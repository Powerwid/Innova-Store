import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto.js';
import { ACCESS_TOKEN_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS } from './auth.constants.js';
import { RefreshTokenPayloadSchema } from './schema/refresh-token-payload.schema.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) { }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
      select: {
        idUsuario: true,
        correo: true,
        contrasena: true,
        estado: { select: { nombre: true } },
      },
    });

    if (!usuario || !await bcrypt.compare(dto.contrasena, usuario.contrasena)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (usuario.estado.nombre !== 'ACTIVO') {
      throw new UnauthorizedException('Usuario no disponible');
    }

    return {
      accessToken: await this.jwt.signAsync(
        { sub: usuario.idUsuario, tipo: 'access' },
        { expiresIn: ACCESS_TOKEN_MAX_AGE_MS / 1000 },
      ),
      refreshToken: await this.jwt.signAsync(
        { sub: usuario.idUsuario, tipo: 'refresh' },
        { expiresIn: REFRESH_TOKEN_MAX_AGE_MS / 1000 },
      ),
      usuario: { idUsuario: usuario.idUsuario, correo: usuario.correo },
    };
  }

  async refresh(token: string) {
    let idUsuario: number;
    try {
      const payload = RefreshTokenPayloadSchema.parse(
        await this.jwt.verifyAsync(token),
      );
      idUsuario = payload.sub;
    } catch {
      throw new UnauthorizedException('Token de renovación inválido o expirado');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { idUsuario },
      select: { estado: { select: { nombre: true } } },
    });
    if (!usuario || usuario.estado.nombre !== 'ACTIVO') {
      throw new UnauthorizedException('Usuario no disponible');
    }

    return this.jwt.signAsync(
      { sub: idUsuario, tipo: 'access' },
      { expiresIn: ACCESS_TOKEN_MAX_AGE_MS / 1000 },
    );
  }

  async cambiarContrasena(idUsuario: number, dto: CambiarContrasenaDto) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { idUsuario },
      select: { contrasena: true },
    });
    if (!await bcrypt.compare(dto.contrasenaActual, usuario.contrasena)) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    await this.prisma.usuario.update({
      where: { idUsuario },
      data: { contrasena: await bcrypt.hash(dto.contrasenaNueva, 10) },
    });
    return { message: 'Contraseña actualizada' };
  }
}
