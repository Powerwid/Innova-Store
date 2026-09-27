export interface Pagina<T> {
  data: T[]
  total: number
  pagina: number
  limite: number
}
export interface ConsultaLogistica {
  pagina?: number
  limite?: number
  buscar?: string
  estado?: boolean
  idSucursal?: number
  idAlmacen?: number
  idProducto?: number
  idInventario?: number
  idCategoria?: number
  idTipoProducto?: number
  idTipoMovimiento?: number
  desde?: string
  hasta?: string
}
export type RecursoCatalogo = 'tipos-producto' | 'categorias' | 'unidades-medida'
export interface CatalogoBase { nombre: string; estado: boolean; createdAt: string; updatedAt: string }
export interface TipoProducto extends CatalogoBase { idTipoProducto: number }
export interface Categoria extends CatalogoBase { idCategoria: number; color: string | null }
export interface UnidadMedida extends CatalogoBase { idUnidadMedida: number; simbolo: string }
export type Catalogo = TipoProducto | Categoria | UnidadMedida

export interface Producto {
  idProducto: number
  idTipoProducto: number
  idCategoria: number
  idUnidadMedida: number
  nombre: string
  detalle: string | null
  codigoBarras: string | null
  imagen: string | null
  estado: boolean
  tipoProducto: TipoProducto
  categoria: Categoria
  unidadMedida: UnidadMedida
  createdAt: string
  updatedAt: string
}
export interface ProductoPayload {
  idTipoProducto: number
  idCategoria: number
  idUnidadMedida: number
  nombre: string
  detalle: string | null
  codigoBarras: string | null
  imagen: string | null
  estado: boolean
}
export interface ProductoSucursal {
  idProductoSucursal: number
  idProducto: number
  idSucursal: number
  precioCompra: string
  precioVenta: string
  estado: boolean
  producto: Producto
  sucursal: { idSucursal: number; nombre: string }
}
export interface Almacen {
  idAlmacen: number
  idSucursal: number
  nombre: string
  direccion: string | null
  estado: boolean
  createdAt: string
  updatedAt: string
}
export interface Inventario {
  idInventario: number
  idProductoSucursal: number
  idAlmacen: number
  idSucursal: number
  stock: string
  stockMinimo: string
  almacen: Almacen
  productoSucursal: ProductoSucursal
  createdAt: string
  updatedAt: string
}
export interface TipoMovimiento {
  idTipoMovimiento: number
  nombre: string
  entradaSalida: 'ENTRADA' | 'SALIDA'
}
export interface MovimientoInventario {
  idMovimiento: number
  idInventario: number
  idTipoMovimiento: number
  idUsuario: number
  cantidad: string
  stockAnterior: string
  stockResultante: string
  observacion: string | null
  fechaMovimiento: string
  tipoMovimiento: TipoMovimiento
  inventario: Inventario
  usuario: { idUsuario: number; perfil: { nombres: string; apellidos: string } | null }
}
export interface ConfiguracionGlobal {
  nombre: string
  activo: boolean
  createdAt: string
  updatedAt: string
}
