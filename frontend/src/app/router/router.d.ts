import 'vue-router'
import type { TipoReporte } from '@/modules/reportes/reportes.api'

export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    guestOnly?: boolean
    permission?: string
    permissionsAny?: string[]
    superadminOnly?: boolean
    reportType?: TipoReporte
  }
}
