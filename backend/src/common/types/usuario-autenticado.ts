export interface UsuarioAutenticado {
  idUsuario: number;
  correo: string;
  estado: string;
  rol: {
    idRol: number;
    nombre: string;
  };
  permisos: string[];
  sucursales: number[];
}
