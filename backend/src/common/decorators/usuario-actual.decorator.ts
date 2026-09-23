import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';

export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado =>
    context.switchToHttp().getRequest<{ user: UsuarioAutenticado }>().user,
);
