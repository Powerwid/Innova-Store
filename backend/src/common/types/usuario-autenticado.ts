export interface UsuarioAutenticado {
  idUsuario: number;
  correo: string;
  estado: string;
  roles: string[];
  permisos: string[];
}
