import type { MedioPago, PersonaRegistro } from '@/core/types/administracion.types'
import type { Almacen, ProductoSucursal } from '@/modules/logistica/logistica.types'

export interface Pagina<T> { data: T[]; total: number; pagina: number; limite: number }
export interface ConsultaOperacion {
  pagina?: number; limite?: number; buscar?: string; idSucursal?: number; idCaja?: number
  idMotivoIngreso?: number; idMotivoEgreso?: number; idCompra?: number; idProveedor?: number
  idCliente?: number; idAlmacen?: number; abierta?: boolean; activo?: boolean
  estado?: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA'; desde?: string; hasta?: string
}
export interface UsuarioResumen { idUsuario: number; correo: string; perfil?: { nombres: string; apellidos: string } | null }
export interface SucursalResumen { idSucursal: number; nombre: string }
export interface PagoPayload { idMedioPago: number; monto: string }
export interface Pago extends PagoPayload { medioPago: MedioPago }
export interface CajaDetalle extends PagoPayload { idCaja?: number; medioPago: MedioPago }
export interface Caja {
  idCaja: number; idSucursal: number; idUsuarioApertura: number; idUsuarioCierre: number | null
  montoApertura: string; montoCierre: string | null; fechaApertura: string; fechaCierre: string | null
  createdAt?: string; updatedAt?: string; sucursal: SucursalResumen; usuarioApertura: UsuarioResumen
  usuarioCierre: UsuarioResumen | null; detalles: CajaDetalle[]
}
export interface MotivoIngreso { idMotivoIngreso: number; motivo: string; activo: boolean; reservado?: boolean }
export interface MotivoEgreso { idMotivoEgreso: number; motivo: string; activo: boolean; reservado?: boolean }
export interface TipoComprobante { idTipoComprobante: number; nombre: string; codigoSunat: string | null }
export interface ProductoMovimiento {
  idProductoSucursal: number; idAlmacen: number; cantidad: string; precioUnitario: string
  productoSucursal: ProductoSucursal; almacen: Almacen
}
export interface Ingreso {
  idIngreso: number; idCaja: number; idSucursal: number; idMotivoIngreso: number; idUsuario: number
  monto: string; detalle: string | null; fechaIngreso: string; caja: Caja; sucursal: SucursalResumen
  motivoIngreso: MotivoIngreso; usuario: UsuarioResumen; pagos: Pago[]; productos: ProductoMovimiento[]
  deudaOriginada?: DeudaCliente | null; abonoDeuda?: unknown | null
}
export interface Egreso {
  idEgreso: number; idCaja: number; idSucursal: number; idMotivoEgreso: number; idUsuario: number
  monto: string; detalle: string | null; fechaEgreso: string; caja: Caja; sucursal: SucursalResumen
  motivoEgreso: MotivoEgreso; usuario: UsuarioResumen; pagos: Pago[]; compra?: Compra | null
}
export interface CompraDetalle {
  idCompraDetalle: number; idProductoSucursal: number; cantidad: string; precioUnitario: string
  productoSucursal: ProductoSucursal
}
export interface Compra {
  idCompra: number; idSucursal: number; idAlmacen: number; idProveedor: number | null; idUsuario: number
  nombreProveedor: string; fechaCompra: string; subtotal: string | null; igv: string | null; total: string
  montoPagado: string; saldoPendiente: string; proveedor: PersonaRegistro | null; sucursal: SucursalResumen
  almacen: Almacen; usuario: UsuarioResumen; detalles: CompraDetalle[]
  comprobante?: { idComprobante: number; serie: string; numero: string; fechaEmision: string; tipoComprobante: TipoComprobante } | null
  egresos: Egreso[]; percepciones: Array<Record<string, unknown>>
}
export interface DeudaCliente {
  idDeudaCliente: number; idCliente: number; idIngresoOrigen: number; idEgreso: number; fechaVencimiento: string | null
  cliente: PersonaRegistro; ingresoOrigen: Ingreso; egreso: Egreso
  montoOriginal: string; montoAbonado: string; saldoPendiente: string
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA'
  abonos: Array<{ idAbonoDeudaCliente: number; ingresoAbono: Ingreso }>
}
export type Movimiento = Ingreso | Egreso
export interface LineaProductoPayload { idProductoSucursal: number; idAlmacen?: number; cantidad: string; precioUnitario: string }
export interface AbrirCajaPayload { idSucursal: number; montoApertura: string; detalles: PagoPayload[] }
export interface MovimientoPayload {
  idCaja: number; idSucursal: number; monto: string; detalle?: string; pagos: PagoPayload[]
  idMotivoIngreso?: number; idMotivoEgreso?: number; fechaIngreso?: string; fechaEgreso?: string
}

