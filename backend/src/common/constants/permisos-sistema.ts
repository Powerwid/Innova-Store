import { PermisoSistema } from '../enums/permiso-sistema.enum.js';

export interface DefinicionPermiso {
  nombre: PermisoSistema;
  etiqueta: string;
  modulo: string;
  orden: number;
}

export const PERMISOS_SISTEMA: readonly DefinicionPermiso[] = [
  { nombre: PermisoSistema.LOGISTICA_VER, etiqueta: 'Ver logística', modulo: 'Logística', orden: 500 },
  { nombre: PermisoSistema.LOGISTICA_GESTIONAR, etiqueta: 'Gestionar logística', modulo: 'Logística', orden: 510 },
  {
    nombre: PermisoSistema.DASHBOARD_VER,
    etiqueta: 'Ver dashboard',
    modulo: 'Dashboard',
    orden: 10,
  },
  {
    nombre: PermisoSistema.USUARIOS_VER,
    etiqueta: 'Ver usuarios',
    modulo: 'Usuarios',
    orden: 100,
  },
  {
    nombre: PermisoSistema.USUARIOS_GESTIONAR,
    etiqueta: 'Gestionar usuarios',
    modulo: 'Usuarios',
    orden: 110,
  },
  {
    nombre: PermisoSistema.SUCURSALES_VER,
    etiqueta: 'Ver sucursales',
    modulo: 'Sucursales',
    orden: 200,
  },
  {
    nombre: PermisoSistema.SUCURSALES_GESTIONAR,
    etiqueta: 'Gestionar sucursales',
    modulo: 'Sucursales',
    orden: 210,
  },
  {
    nombre: PermisoSistema.MEDIOS_PAGO_VER,
    etiqueta: 'Ver medios de pago',
    modulo: 'Medios de pago',
    orden: 300,
  },
  {
    nombre: PermisoSistema.MEDIOS_PAGO_GESTIONAR,
    etiqueta: 'Gestionar medios de pago',
    modulo: 'Medios de pago',
    orden: 310,
  },
  {
    nombre: PermisoSistema.PERSONAS_VER,
    etiqueta: 'Ver clientes y proveedores',
    modulo: 'Clientes y proveedores',
    orden: 400,
  },
  {
    nombre: PermisoSistema.PERSONAS_GESTIONAR,
    etiqueta: 'Gestionar clientes y proveedores',
    modulo: 'Clientes y proveedores',
    orden: 410,
  },
];

export const PERMISOS_SISTEMA_POR_NOMBRE = new Map(
  PERMISOS_SISTEMA.map((permiso) => [permiso.nombre, permiso]),
);
