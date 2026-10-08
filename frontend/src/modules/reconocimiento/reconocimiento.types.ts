import type { Categoria, Pagina, UnidadMedida } from '@/modules/logistica/logistica.types'

export type EstadoReferencia = 'PENDIENTE' | 'PROCESANDO' | 'DISPONIBLE' | 'ERROR' | 'RETIRADA'

export interface ReferenciaVisual {
  idReferencia: number
  idProducto: number
  activo: boolean
  estado: EstadoReferencia
  modeloVersion: string | null
  dimension: number | null
  intentos: number
  ultimoError: string | null
  proximoIntento: string | null
  indexadoAt: string | null
  createdAt: string
  updatedAt: string
  imagenUrl: string
}

export interface EstadoReconocimiento {
  configurado: boolean
  disponible: boolean
  servicio: { status: string; modelVersion: string; referenceCount: number; modelLoaded: boolean } | null
  referencias: Partial<Record<EstadoReferencia, number>>
  similitudMinima: number
  umbralCalibrado: boolean
  requiereConfirmacion: true
}

export interface CandidatoVisual {
  idProducto: number
  idProductoSucursal: number
  nombre: string
  imagen: string | null
  precioCompra: string
  precioVenta: string
  unidadMedida: UnidadMedida
  categoria: Categoria
  idReferencia: number
  similitud: number
}

export interface ResultadoReconocimiento {
  idSucursal: number
  modeloVersion: string
  similitudMinima: number
  requiereConfirmacion: true
  estado: 'CANDIDATOS' | 'SIN_REFERENCIAS' | 'SIN_COINCIDENCIAS'
  mensaje: string
  candidatos: CandidatoVisual[]
}

export interface SeleccionVisual { candidato: CandidatoVisual; cantidad: number }
export type PaginaReferencias = Pagina<ReferenciaVisual>
