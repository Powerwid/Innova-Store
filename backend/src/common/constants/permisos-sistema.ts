import { PermisoSistema } from '../enums/permiso-sistema.enum.js';

export interface DefinicionPermiso {
  nombre: PermisoSistema;
  etiqueta: string;
  modulo: string;
  orden: number;
}

export const PERMISOS_SISTEMA: readonly DefinicionPermiso[] = [
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
    nombre: PermisoSistema.USUARIOS_CREAR,
    etiqueta: 'Crear usuarios',
    modulo: 'Usuarios',
    orden: 110,
  },
  {
    nombre: PermisoSistema.USUARIOS_EDITAR,
    etiqueta: 'Editar usuarios',
    modulo: 'Usuarios',
    orden: 120,
  },
  {
    nombre: PermisoSistema.USUARIOS_ACTIVAR,
    etiqueta: 'Activar usuarios',
    modulo: 'Usuarios',
    orden: 130,
  },
  {
    nombre: PermisoSistema.USUARIOS_DESACTIVAR,
    etiqueta: 'Desactivar usuarios',
    modulo: 'Usuarios',
    orden: 140,
  },
  {
    nombre: PermisoSistema.USUARIOS_ASIGNAR_SUCURSALES,
    etiqueta: 'Asignar sucursales a usuarios',
    modulo: 'Usuarios',
    orden: 150,
  },
  {
    nombre: PermisoSistema.SUCURSALES_VER,
    etiqueta: 'Ver sucursales',
    modulo: 'Sucursales',
    orden: 200,
  },
  {
    nombre: PermisoSistema.SUCURSALES_CREAR,
    etiqueta: 'Crear sucursales',
    modulo: 'Sucursales',
    orden: 210,
  },
  {
    nombre: PermisoSistema.SUCURSALES_EDITAR,
    etiqueta: 'Editar sucursales',
    modulo: 'Sucursales',
    orden: 220,
  },
  {
    nombre: PermisoSistema.SUCURSALES_ACTIVAR,
    etiqueta: 'Activar sucursales',
    modulo: 'Sucursales',
    orden: 230,
  },
  {
    nombre: PermisoSistema.SUCURSALES_DESACTIVAR,
    etiqueta: 'Desactivar sucursales',
    modulo: 'Sucursales',
    orden: 240,
  },
  {
    nombre: PermisoSistema.MEDIOS_PAGO_VER,
    etiqueta: 'Ver medios de pago',
    modulo: 'Medios de pago',
    orden: 300,
  },
  {
    nombre: PermisoSistema.MEDIOS_PAGO_CREAR,
    etiqueta: 'Crear medios de pago',
    modulo: 'Medios de pago',
    orden: 310,
  },
  {
    nombre: PermisoSistema.MEDIOS_PAGO_EDITAR,
    etiqueta: 'Editar medios de pago',
    modulo: 'Medios de pago',
    orden: 320,
  },
  {
    nombre: PermisoSistema.MEDIOS_PAGO_ELIMINAR,
    etiqueta: 'Eliminar medios de pago',
    modulo: 'Medios de pago',
    orden: 330,
  },
];

export const PERMISOS_SISTEMA_POR_NOMBRE = new Map(
  PERMISOS_SISTEMA.map((permiso) => [permiso.nombre, permiso]),
);
