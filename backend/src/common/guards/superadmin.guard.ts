import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../decorators/public.decorator.js';
import { SOLO_SUPERADMIN_KEY } from '../decorators/solo-superadmin.decorator.js';
import { RolSistema } from '../enums/rol-sistema.enum.js';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';

@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;
    const rolRequerido = this.reflector.getAllAndOverride<RolSistema>(
      SOLO_SUPERADMIN_KEY,
      targets,
    );
    if (!rolRequerido) return true;

    const { user } = context.switchToHttp().getRequest<{ user: UsuarioAutenticado }>();
    if (user?.rol.nombre !== rolRequerido) {
      throw new ForbiddenException('Solo SUPERADMIN puede realizar esta operación');
    }
    return true;
  }
}
