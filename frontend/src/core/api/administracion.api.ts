import { http } from "./http";
import type {
  DatosDocumento,
  PermisoRegistro,
  RolRegistro,
  Sucursal,
  TipoDocumento,
  Usuario,
  UsuarioPayload,
  MedioPago,
} from "@/core/types/administracion.types";

export const usuariosApi = {
  listar: () => http.get<Usuario[]>("/usuarios"),
  rolesDisponibles: () =>
    http.get<{ idRol: number; nombre: string }[]>(
      "/usuarios/roles-disponibles",
    ),
  obtener: (id: number) => http.get<Usuario>(`/usuarios/${id}`),
  crear: (payload: UsuarioPayload) =>
    http.post<{ message: string; usuario: Usuario }>("/usuarios", payload),
  actualizar: (id: number, payload: Record<string, unknown>) =>
    http.patch<{ message: string; usuario: Usuario }>(
      `/usuarios/${id}`,
      payload,
    ),
  asignarSucursales: (id: number, idsSucursales: number[]) =>
    http.patch<{ message: string; usuario: Usuario }>(
      `/usuarios/${id}/sucursales`,
      { idsSucursales },
    ),
};
export const rolesApi = {
  listar: () => http.get<RolRegistro[]>("/roles"),
  crear: (nombre: string) =>
    http.post<{ message: string; rol: RolRegistro }>("/roles", { nombre }),
  eliminar: (id: number) => http.delete<{ message: string }>(`/roles/${id}`),
  permisos: () => http.get<PermisoRegistro[]>("/permisos"),
  sincronizarPermisos: (id: number, idsPermisos: number[]) =>
    http.put<{ message: string; rol: RolRegistro }>(`/roles/${id}/permisos`, {
      idsPermisos,
    }),
};
export const sucursalesApi = {
  listar: () => http.get<Sucursal[]>("/sucursales"),
  obtener: (id: number) => http.get<Sucursal>(`/sucursales/${id}`),
  crear: (payload: { nombre: string; perfil?: Record<string, unknown> }) =>
    http.post<{ message: string; sucursal: Sucursal }>("/sucursales", payload),
  actualizar: (id: number, payload: Record<string, unknown>) =>
    http.patch<{ message: string; sucursal: Sucursal }>(
      `/sucursales/${id}`,
      payload,
    ),
};
export const documentosApi = {
  tipos: () => http.get<TipoDocumento[]>("/documentos/tipos"),
  consultar: (tipo: "DNI" | "RUC", numero: string) =>
    http.get<DatosDocumento>(
      `/documentos/${tipo}/${encodeURIComponent(numero)}`,
    ),
};

export const mediosPagoApi = {
  listar: () => http.get<MedioPago[]>('/medios-pago'),
  crear: (nombre: string) => http.post<{ message: string; medioPago: MedioPago }>('/medios-pago', { nombre }),
  actualizar: (id: number, nombre: string) => http.patch<{ message: string; medioPago: MedioPago }>(`/medios-pago/${id}`, { nombre }),
  eliminar: (id: number) => http.delete<{ message: string }>(`/medios-pago/${id}`),
};
