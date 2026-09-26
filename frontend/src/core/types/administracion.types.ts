export interface TipoDocumento {
  idTipoDocumento: number;
  nombre: string;
}
export interface PerfilUsuario {
  nombres: string;
  apellidos: string;
  idTipoDocumento: number | null;
  numeroDocumento: string | null;
  telefono: string | null;
  direccion: string | null;
  tipoDocumento?: TipoDocumento | null;
}
export interface Usuario {
  idUsuario: number;
  correo: string;
  estado: { nombre: string };
  rol: { idRol: number; nombre: string };
  perfil: PerfilUsuario | null;
  sucursales: {
    sucursal: { idSucursal: number; nombre: string; activo: boolean };
  }[];
}
export interface UsuarioPayload {
  correo: string;
  contrasena: string;
  idRol: number;
  perfil: {
    nombres: string;
    apellidos: string;
    idTipoDocumento?: number;
    numeroDocumento?: string;
    telefono?: string;
    direccion?: string;
  };
}
export interface PermisoRegistro {
  idPermiso: number;
  nombre: string;
  etiqueta: string;
  modulo: string;
  orden: number;
}
export interface RolRegistro {
  idRol: number;
  nombre: string;
  cantidadUsuarios: number;
  cantidadPermisos: number;
  permisos: PermisoRegistro[];
}
export interface PerfilSucursal {
  idTipoDocumento: number | null;
  numeroDocumento: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  direccionComercial: string | null;
  direccionFiscal: string | null;
  direccionWeb: string | null;
  ubigeo: string | null;
  igv: string | number;
  telefono: string | null;
  correo: string | null;
  tipoDocumento?: TipoDocumento | null;
}
export interface Sucursal {
  idSucursal: number;
  nombre: string;
  activo: boolean;
  perfil: PerfilSucursal | null;
  _count: { usuarios: number };
}
export interface MedioPago {
  idMedioPago: number;
  nombre: string;
}
export type DatosDocumento =
  | {
      tipoDocumento: "DNI";
      idTipoDocumento: number;
      numeroDocumento: string;
      nombres: string;
      apellidos: string;
      nombreCompleto: string;
    }
  | {
      tipoDocumento: "RUC";
      idTipoDocumento: number;
      numeroDocumento: string;
      razonSocial: string;
      direccion: string | null;
      ubigeo: string | null;
      departamento: string | null;
      provincia: string | null;
      distrito: string | null;
      estadoSunat: string | null;
      condicionSunat: string | null;
    };
