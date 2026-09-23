import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ESTADOS_PERMITIDOS_KEY } from '../decorators/estados-permitidos.decorator.js';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';

@Injectable()
export class EstadoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const { user } = context.switchToHttp().getRequest<{ user: UsuarioAutenticado }>();
    const permitidos = this.reflector.getAllAndOverride<string[]>(
      ESTADOS_PERMITIDOS_KEY,
      targets,
    ) ?? ['ACTIVO'];

    if (!user || !permitidos.includes(user.estado)) {
      throw new ForbiddenException('Estado no permitido para esta operación');
    }
    return true;
  }
}
