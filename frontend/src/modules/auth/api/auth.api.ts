import { http } from '@/core/api/http'
import type { LoginPayload, LoginResponse, UsuarioAutenticado } from '@/core/types/auth.types'

export const authApi = {
  login(payload: LoginPayload) {
    return http.post<LoginResponse>('/auth/login', payload)
  },
  me() {
    return http.get<UsuarioAutenticado>('/auth/me')
  },
  logout() {
    return http.post<{ message: string }>('/auth/logout')
  },
  cambiarContrasena(payload: { contrasenaActual: string; contrasenaNueva: string }) {
    return http.patch<{ message: string }>('/auth/contrasena', payload)
  },
}
