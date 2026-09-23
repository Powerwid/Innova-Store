import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTENTICADO_KEY } from '../decorators/autenticado.decorator.js';
import { PERMISOS_KEY } from '../decorators/requiere-permiso.decorator.js';
import { PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/requiere-rol.decorator.js';
import { SOLO_SUPERADMIN_KEY } from '../decorators/solo-superadmin.decorator.js';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const permisos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, targets);
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    const soloSuperadmin = this.reflector.getAllAndOverride<boolean>(SOLO_SUPERADMIN_KEY, targets);
    const autenticado = this.reflector.getAllAndOverride<boolean>(AUTENTICADO_KEY, targets);
    if (!permisos?.length) {
      if (roles?.length || soloSuperadmin || autenticado) return true;
      throw new ForbiddenException('La ruta no tiene una política de acceso definida');
    }

    const { user } = context.switchToHttp().getRequest<{ user: UsuarioAutenticado }>();
    if (!user?.roles.includes('SUPERADMIN') && !permisos.every((permiso) => user?.permisos.includes(permiso))) {
      throw new ForbiddenException('Permiso requerido');
    }
    return true;
  }
}
