import { http } from '@/core/api/http'
import type {
  AbrirCajaPayload, Caja, Compra, ConsultaOperacion, DeudaCliente, Egreso, Ingreso,
  MotivoEgreso, MotivoIngreso, MovimientoPayload, Pagina, TipoComprobante, ResumenCaja,
} from './operaciones.types'

const query = (params?: ConsultaOperacion) => ({ params: params ? Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
) : undefined })

export const cajasApi = {
  listar: (params?: ConsultaOperacion) => http.get<Pagina<Caja>>('/cajas', query(params)),
  abierta: (idSucursal: number) => http.get<Caja>('/cajas/abierta', { params: { idSucursal } }),
  obtener: (id: number) => http.get<Caja>(`/cajas/${id}`),
  resumen: (id: number) => http.get<{ caja: Caja; resumen: ResumenCaja }>(`/cajas/${id}/resumen`),
  abrir: (payload: AbrirCajaPayload) => http.post<Caja>('/cajas', payload),
  cerrar: (id: number, montoCierre: string) => http.patch<Caja & { montoEsperado: string; diferencia: string }>(`/cajas/${id}/cerrar`, { montoCierre }),
}

function catalogoApi<T>(base: string) {
  return {
    listar: (params?: ConsultaOperacion) => http.get<Pagina<T>>(base, query(params)),
    obtener: (id: number) => http.get<T>(`${base}/${id}`),
    crear: (payload: Record<string, unknown>) => http.post<T>(base, payload),
    actualizar: (id: number, payload: Record<string, unknown>) => http.patch<T>(`${base}/${id}`, payload),
    eliminar: (id: number) => http.delete<{ message: string }>(`${base}/${id}`),
  }
}
export const motivosIngresoApi = catalogoApi<MotivoIngreso>('/motivos-ingreso')
export const motivosEgresoApi = catalogoApi<MotivoEgreso>('/motivos-egreso')
export const tiposComprobanteApi = catalogoApi<TipoComprobante>('/tipos-comprobante')

export const ingresosApi = {
  listar: (params?: ConsultaOperacion) => http.get<Pagina<Ingreso>>('/ingresos', query(params)),
  obtener: (id: number) => http.get<Ingreso>(`/ingresos/${id}`),
  crear: (payload: MovimientoPayload) => http.post<Ingreso>('/ingresos', payload),
}
export const egresosApi = {
  listar: (params?: ConsultaOperacion) => http.get<Pagina<Egreso>>('/egresos', query(params)),
  obtener: (id: number) => http.get<Egreso>(`/egresos/${id}`),
  crear: (payload: MovimientoPayload) => http.post<Egreso>('/egresos', payload),
}
export const ventasApi = {
  listar: (params?: ConsultaOperacion) => http.get<Pagina<Ingreso>>('/ventas', query(params)),
  obtener: (id: number) => http.get<Ingreso>(`/ventas/${id}`),
  crear: (payload: Record<string, unknown>) => http.post<Ingreso>('/ventas', payload),
}
export const comprasApi = {
  listar: (params?: ConsultaOperacion) => http.get<Pagina<Compra>>('/compras', query(params)),
  obtener: (id: number) => http.get<Compra>(`/compras/${id}`),
  crear: (payload: Record<string, unknown>) => http.post<Compra>('/compras', payload),
  pagar: (id: number, payload: Record<string, unknown>) => http.post<Compra>(`/compras/${id}/pagos`, payload),
  percepcion: (id: number, payload: Record<string, unknown>) => http.post<Compra>(`/compras/${id}/percepciones`, payload),
}
export const deudasApi = {
  listar: (params?: ConsultaOperacion) => http.get<Pagina<DeudaCliente>>('/deudas-clientes', query(params)),
  obtener: (id: number) => http.get<DeudaCliente>(`/deudas-clientes/${id}`),
  abonar: (id: number, payload: Record<string, unknown>) => http.post<DeudaCliente>(`/deudas-clientes/${id}/abonos`, payload),
}

export async function cargarTodo<T>(listar: (q: ConsultaOperacion) => Promise<{ data: Pagina<T> }>, extra: ConsultaOperacion = {}) {
  const items: T[] = []
  let pagina = 1
  let total = 0
  do {
    const response = await listar({ ...extra, pagina: pagina++, limite: 100 })
    items.push(...response.data.data)
    total = response.data.total
    if (!response.data.data.length) break
  } while (items.length < total)
  return items
}
