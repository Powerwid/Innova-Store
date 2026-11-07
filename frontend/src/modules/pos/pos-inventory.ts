import type { Almacen, Inventario, ProductoSucursal } from '../logistica/logistica.types'
import type { PosLine } from './pos-drafts'

export function resolvePosWarehouse(warehouses: readonly Almacen[], warehouseId: number | null) {
  const available = warehouses.filter((warehouse) => warehouse.estado)
  return (
    available.find((warehouse) => warehouse.idAlmacen === warehouseId) ??
    available.find((warehouse) => warehouse.tipo === 'AREA_VENTA') ??
    available[0] ??
    null
  )
}

export function posStockByProduct(inventory: readonly Inventario[], warehouseId: number | null) {
  return new Map(
    inventory
      .filter((item) => item.idAlmacen === warehouseId)
      .map((item) => [item.idProductoSucursal, Number(item.stock)]),
  )
}

export function posLineCatalogIssue(
  line: PosLine,
  products: readonly ProductoSucursal[],
  warehouses: readonly Almacen[],
) {
  const product = products.find((item) => item.idProductoSucursal === line.productId)
  if (!product?.estado || !product.producto.estado) return 'Producto no disponible'
  // Tras un reseteo, un ID numérico puede pertenecer a un registro distinto.
  const differentProduct = line.productCreatedAt
    ? Date.parse(line.productCreatedAt) !== Date.parse(product.producto.createdAt)
    : line.name !== product.producto.nombre
  if (differentProduct || line.unit !== product.producto.unidadMedida.simbolo)
    return 'El producto guardado cambió. Retíralo y agrégalo nuevamente.'

  const warehouse = warehouses.find((item) => item.idAlmacen === line.warehouseId && item.estado)
  if (!warehouse) return 'Almacén no disponible. Retira el producto y agrégalo nuevamente.'
  if (
    line.warehouseCreatedAt &&
    Date.parse(line.warehouseCreatedAt) !== Date.parse(warehouse.createdAt)
  )
    return 'El almacén guardado cambió. Retira el producto y agrégalo nuevamente.'
  if (line.price !== Number(product.precioVenta) || Number(product.precioVenta) <= 0)
    return 'El precio cambió. Retira el producto y agrégalo nuevamente.'
  return ''
}
