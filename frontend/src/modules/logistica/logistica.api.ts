import { http } from '@/core/api/http'
import type {
  Almacen, Catalogo, Categoria, ConfiguracionGlobal, ConsultaLogistica, Inventario,
  MovimientoInventario, Pagina, Producto, ProductoPayload, ProductoSucursal,
  RecursoCatalogo, TipoMovimiento, TipoProducto, UnidadMedida,
} from './logistica.types'

const base = '/logistica'
const query = (params?: ConsultaLogistica) => ({ params: params ? Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
) : undefined })

export const catalogosApi = {
  listar: (recurso: RecursoCatalogo, params?: ConsultaLogistica) =>
    http.get<Pagina<Catalogo>>(`${base}/${recurso}`, query(params)),
  crear: (recurso: RecursoCatalogo, payload: Record<string, unknown>) =>
    http.post<Catalogo>(`${base}/${recurso}`, payload),
  actualizar: (recurso: RecursoCatalogo, id: number, payload: Record<string, unknown>) =>
    http.patch<Catalogo>(`${base}/${recurso}/${id}`, payload),
  eliminar: (recurso: RecursoCatalogo, id: number) =>
    http.delete<{ message: string }>(`${base}/${recurso}/${id}`),
}
export async function cargarCatalogoCompleto<T extends Catalogo>(recurso: RecursoCatalogo): Promise<T[]> {
  const data: T[] = []
  let pagina = 1
  let total = 0
  do {
    const response = await catalogosApi.listar(recurso, { pagina, limite: 100, estado: true })
    data.push(...response.data.data as T[])
    total = response.data.total
    pagina++
  } while (data.length < total)
  return data
}
export const productosApi = {
  listar: (params?: ConsultaLogistica) => http.get<Pagina<Producto>>(`${base}/productos`, query(params)),
  obtener: (id: number) => http.get<Producto>(`${base}/productos/${id}`),
  crear: (payload: ProductoPayload) => http.post<Producto>(`${base}/productos`, payload),
  actualizar: (id: number, payload: Partial<ProductoPayload>) => http.patch<Producto>(`${base}/productos/${id}`, payload),
  eliminar: (id: number) => http.delete<{ message: string }>(`${base}/productos/${id}`),
}
export const productoSucursalApi = {
  listar: (params?: ConsultaLogistica) => http.get<Pagina<ProductoSucursal>>(`${base}/producto-sucursal`, query(params)),
  crear: (payload: { idProducto: number; idSucursal: number; precioCompra: string; precioVenta: string; estado: boolean }) =>
    http.post<ProductoSucursal>(`${base}/producto-sucursal`, payload),
  actualizar: (id: number, payload: { precioCompra?: string; precioVenta?: string; estado?: boolean }) =>
    http.patch<ProductoSucursal>(`${base}/producto-sucursal/${id}`, payload),
  eliminar: (id: number) => http.delete<{ message: string }>(`${base}/producto-sucursal/${id}`),
}
export const almacenesApi = {
  listar: (params?: ConsultaLogistica) => http.get<Pagina<Almacen>>(`${base}/almacenes`, query(params)),
  crear: (payload: { idSucursal: number; nombre: string; direccion: string | null; estado: boolean }) =>
    http.post<Almacen>(`${base}/almacenes`, payload),
  actualizar: (id: number, payload: { nombre?: string; direccion?: string | null; estado?: boolean }) =>
    http.patch<Almacen>(`${base}/almacenes/${id}`, payload),
  eliminar: (id: number) => http.delete<{ message: string }>(`${base}/almacenes/${id}`),
}
export const inventariosApi = {
  listar: (params?: ConsultaLogistica) => http.get<Pagina<Inventario>>(`${base}/inventarios`, query(params)),
  crear: (payload: { idProductoSucursal: number; idAlmacen: number; stockInicial: string; stockMinimo: string }) =>
    http.post<Inventario>(`${base}/inventarios`, payload),
  actualizarMinimo: (id: number, stockMinimo: string) =>
    http.patch<Inventario>(`${base}/inventarios/${id}`, { stockMinimo }),
  tiposMovimiento: () => http.get<TipoMovimiento[]>(`${base}/tipos-movimiento-inventario`),
  movimientos: (params?: ConsultaLogistica) =>
    http.get<Pagina<MovimientoInventario>>(`${base}/inventario-movimientos`, query(params)),
  mover: (payload: { idInventario: number; idTipoMovimiento: number; cantidad: string; observacion: string | null }) =>
    http.post<MovimientoInventario>(`${base}/inventario-movimientos`, payload),
}
export const configuracionesApi = {
  listar: () => http.get<ConfiguracionGlobal[]>(`${base}/configuraciones-globales`),
  actualizar: (nombre: string, activo: boolean) =>
    http.patch<ConfiguracionGlobal>(`${base}/configuraciones-globales/${encodeURIComponent(nombre)}`, { activo }),
}
export type { TipoProducto, Categoria, UnidadMedida }
