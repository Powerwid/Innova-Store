import {
  Body, Controller, Get, HttpCode, Patch, Post, Req, Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { Autenticado } from '../../common/decorators/autenticado.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { AuthService } from './auth.service.js';
import { LoginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { CambiarContrasenaSchema } from './dto/cambiar-contrasena.dto.js';
import type { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto.js';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE_MS,
} from './auth.constants.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    res.cookie(ACCESS_COOKIE_NAME, result.accessToken, {
      ...this.cookieOptions('/'),
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      ...this.cookieOptions('/api'),
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions('/api/auth/refresh'));
    return { message: 'Login exitoso', usuario: result.usuario };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[REFRESH_COOKIE_NAME];
    if (typeof token !== 'string') {
      throw new UnauthorizedException('Cookie de renovación no encontrada');
    }
    const accessToken = await this.auth.refresh(token);
    res.cookie(ACCESS_COOKIE_NAME, accessToken, {
      ...this.cookieOptions('/'),
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });
    return { message: 'Sesión renovada' };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_COOKIE_NAME, this.cookieOptions('/'));
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions('/api'));
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions('/api/auth/refresh'));
    return { message: 'Sesión cerrada' };
  }

  @Autenticado()
  @Get('me')
  me(@UsuarioActual() usuario: UsuarioAutenticado) {
    return usuario;
  }

  @Autenticado()
  @Patch('contrasena')
  cambiarContrasena(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(CambiarContrasenaSchema)) dto: CambiarContrasenaDto,
  ) {
    return this.auth.cambiarContrasena(usuario.idUsuario, dto);
  }
}
