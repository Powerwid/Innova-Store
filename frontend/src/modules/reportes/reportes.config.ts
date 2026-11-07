import { Permiso } from '@/core/constants/permisos'
import type { TipoReporte } from './reportes.api'

export const reportesConfig: Array<{
  type: TipoReporte; routeName: string; title: string; subtitle: string; icon: string; permission: string; period: boolean
}> = [
  { type: 'ventas', routeName: 'reportes-ventas', title: 'Ventas', subtitle: 'Consulta lo vendido, lo cobrado y los saldos originados.', icon: 'mdi-receipt-text-outline', permission: Permiso.VENTAS_VER, period: true },
  { type: 'productos', routeName: 'reportes-productos', title: 'Productos más vendidos', subtitle: 'Identifica qué productos generan más ventas.', icon: 'mdi-podium', permission: Permiso.VENTAS_VER, period: true },
  { type: 'compras', routeName: 'reportes-compras', title: 'Compras por proveedor', subtitle: 'Revisa las compras y cuánto queda por pagar.', icon: 'mdi-cart-arrow-down', permission: Permiso.COMPRAS_VER, period: true },
  { type: 'caja', routeName: 'caja-flujo', title: 'Flujo de caja', subtitle: 'Revisa el dinero que entra y sale cada día.', icon: 'mdi-cash-multiple', permission: Permiso.CAJA_VER, period: true },
  { type: 'inventario', routeName: 'reportes-inventario', title: 'Stock y reposición', subtitle: 'Detecta productos agotados y cantidades por reponer.', icon: 'mdi-package-variant-closed', permission: Permiso.LOGISTICA_VER, period: false },
  { type: 'deudas', routeName: 'reportes-deudas', title: 'Cuentas por cobrar', subtitle: 'Consulta los saldos pendientes y vencidos de tus clientes.', icon: 'mdi-account-cash-outline', permission: Permiso.DEUDAS_VER, period: false },
]
