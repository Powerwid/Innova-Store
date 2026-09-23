import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto) {
    return this.auth.login(dto);
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
