import 'vue-router'

export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    guestOnly?: boolean
    permission?: string
    superadminOnly?: boolean
  }
}
