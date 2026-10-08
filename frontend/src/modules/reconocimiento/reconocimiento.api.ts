import { http } from '@/core/api/http'
import type { EstadoReconocimiento, PaginaReferencias, ReferenciaVisual, ResultadoReconocimiento } from './reconocimiento.types'

const base = '/reconocimiento'
// La primera inferencia puede cargar los pesos del modelo en memoria.
const timeout = 150_000
function imagenForm(file: File) { const form = new FormData(); form.append('file', file); return form }

export const reconocimientoApi = {
  estado: (signal?: AbortSignal) => http.get<EstadoReconocimiento>(`${base}/estado`, { signal, timeout: 5000 }),
  buscar(file: File, idSucursal: number, signal?: AbortSignal) {
    const form = imagenForm(file)
    form.append('idSucursal', String(idSucursal))
    form.append('limite', '5')
    return http.post<ResultadoReconocimiento>(`${base}/buscar`, form, { signal, timeout })
  },
  listar: (idProducto: number, pagina: number, signal?: AbortSignal) => http.get<PaginaReferencias>(`${base}/productos/${idProducto}/referencias`, { params: { pagina, limite: 12 }, signal }),
  registrar: (idProducto: number, file: File) => http.post<ReferenciaVisual>(`${base}/productos/${idProducto}/referencias`, imagenForm(file), { timeout }),
  reintentar: (id: number) => http.post<ReferenciaVisual>(`${base}/referencias/${id}/reintentar`),
  retirar: (id: number) => http.delete<ReferenciaVisual>(`${base}/referencias/${id}`),
  reindexar: (idProducto: number) => http.post<{ referenciasPendientes: number }>(`${base}/productos/${idProducto}/reindexar`),
}
