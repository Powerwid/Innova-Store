import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { EstadoGuard } from './estado.guard.js';
import { PermisosGuard } from './permisos.guard.js';
import { RolesGuard } from './roles.guard.js';
import { SuperadminGuard } from './superadmin.guard.js';
import { ESTADOS_PERMITIDOS_KEY } from '../decorators/estados-permitidos.decorator.js';
import { PERMISOS_KEY } from '../decorators/requiere-permiso.decorator.js';
import { ROLES_KEY } from '../decorators/requiere-rol.decorator.js';
import { SOLO_SUPERADMIN_KEY } from '../decorators/solo-superadmin.decorator.js';
import { AUTENTICADO_KEY } from '../decorators/autenticado.decorator.js';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.js';
import { RolSistema } from '../enums/rol-sistema.enum.js';

const usuario = (overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado => ({
  idUsuario: 1,
  correo: 'usuario@ejemplo.com',
  estado: 'ACTIVO',
  rol: { idRol: 3, nombre: 'CAJERO' },
  permisos: ['VENTAS_VER'],
  sucursales: [],
  ...overrides,
});

function contexto(user: UsuarioAutenticado): ExecutionContext {
  return {
    getHandler: () => (() => undefined),
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function reflector(metadata: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (key: string) => metadata[key],
  } as unknown as Reflector;
}

describe('guards de acceso', () => {
  it('cierra rutas sin política explícita', () => {
    const guard = new PermisosGuard(reflector({}));
    expect(() => guard.canActivate(contexto(usuario()))).toThrow();
  });

  it('acepta únicamente los permisos vigentes del usuario', () => {
    const guard = new PermisosGuard(reflector({ [PERMISOS_KEY]: ['VENTAS_VER'] }));
    expect(guard.canActivate(contexto(usuario()))).toBe(true);
    expect(() => guard.canActivate(contexto(usuario({ permisos: [] })))).toThrow();
    expect(() => guard.canActivate(contexto(usuario({
      rol: { idRol: 1, nombre: RolSistema.SUPERADMIN },
      permisos: [],
    })))).toThrow();
  });

  it('no permite administrar roles solo por tener un permiso', () => {
    const guard = new SuperadminGuard(reflector({
      [SOLO_SUPERADMIN_KEY]: RolSistema.SUPERADMIN,
    }));
    expect(() => guard.canActivate(contexto(usuario({ permisos: ['USUARIOS_EDITAR'] })))).toThrow();
    expect(guard.canActivate(contexto(usuario({
      rol: { idRol: 1, nombre: RolSistema.SUPERADMIN },
    })))).toBe(true);
  });

  it('consulta nombres de rol sin un enum fijo', () => {
    const guard = new RolesGuard(reflector({ [ROLES_KEY]: ['JEFE_TIENDA'] }));
    expect(guard.canActivate(contexto(usuario({
      rol: { idRol: 4, nombre: 'JEFE_TIENDA' },
    })))).toBe(true);
    expect(() => guard.canActivate(contexto(usuario()))).toThrow();
  });

  it('bloquea incluso al superadmin si su estado no está permitido', () => {
    const guard = new EstadoGuard(reflector({}));
    expect(() => guard.canActivate(contexto(usuario({
      estado: 'BLOQUEADO',
      rol: { idRol: 1, nombre: RolSistema.SUPERADMIN },
    })))).toThrow();
    expect(guard.canActivate(contexto(usuario()))).toBe(true);
  });

  it('admite una excepción de estado declarada en una ruta', () => {
    const guard = new EstadoGuard(reflector({ [ESTADOS_PERMITIDOS_KEY]: ['BLOQUEADO'] }));
    expect(guard.canActivate(contexto(usuario({ estado: 'BLOQUEADO' })))).toBe(true);
  });

  it('admite una ruta marcada para cualquier usuario autenticado', () => {
    const guard = new PermisosGuard(reflector({ [AUTENTICADO_KEY]: true }));
    expect(guard.canActivate(contexto(usuario()))).toBe(true);
  });
});
