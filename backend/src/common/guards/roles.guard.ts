import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/requiere-rol.decorator.js';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;
    const requeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    if (!requeridos?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user: UsuarioAutenticado }>();
    if (!user || !requeridos.includes(user.rol.nombre)) {
      throw new ForbiddenException('Rol requerido');
    }
    return true;
  }
}
