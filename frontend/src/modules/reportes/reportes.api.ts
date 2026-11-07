import { http } from '@/core/api/http'

export type TipoReporte = 'ventas' | 'productos' | 'compras' | 'caja' | 'inventario' | 'deudas'
export type FormatoReporte = 'ticket' | 'excel' | 'pdf'
export type FormatoColumna = 'texto' | 'dinero' | 'cantidad' | 'numero' | 'estado'
export interface ColumnaReporte { key: string; titulo: string; formato: FormatoColumna }
export interface ConsultaReporte {
  idSucursal?: number; desde?: string; hasta?: string; buscar?: string; estado?: string; pagina?: number; limite?: number
}
export interface ResultadoReporte {
  tipo: TipoReporte; titulo: string; descripcion: string; periodo: boolean;
  desde: string | null; hasta: string | null; sucursal: string; generadoEn: string;
  filtros: string;
  columnas: ColumnaReporte[]; resumen: Array<{ titulo: string; valor: string; formato: 'dinero' | 'numero' }>;
  data: Array<Record<string, string | number | null>>; total: number; pagina: number; limite: number
}
export const reportesApi = {
  obtener: (tipo: TipoReporte, params: ConsultaReporte) => http.get<ResultadoReporte>(`/reportes/${tipo}`, { params }),
  exportar: (tipo: TipoReporte, formato: FormatoReporte, params: ConsultaReporte) => http.get<Blob>(`/reportes/${tipo}/exportar/${formato}`, { params, responseType: 'blob' }),
}
