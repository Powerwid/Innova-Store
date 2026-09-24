export interface RolUsuario {
  idRol: number
  nombre: string
}

export interface UsuarioAutenticado {
  idUsuario: number
  correo: string
  estado: string
  rol: RolUsuario
  permisos: string[]
  sucursales: number[]
}

export interface LoginPayload {
  correo: string
  contrasena: string
}

export interface LoginResponse {
  message: string
  usuario: Pick<UsuarioAutenticado, 'idUsuario' | 'correo'>
}
