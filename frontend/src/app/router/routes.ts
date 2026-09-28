import type { RouteRecordRaw } from 'vue-router'
import { Permiso } from '@/core/constants/permisos'

export const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('@/app/layouts/AuthLayout.vue'),
    meta: { guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/modules/auth/pages/LoginPage.vue'),
        meta: { title: 'Iniciar sesión', guestOnly: true },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/app/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/modules/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Panel principal', requiresAuth: true },
      },
      {
        path: 'administracion/usuarios',
        name: 'usuarios',
        component: () => import('@/modules/usuarios/pages/UsuariosPage.vue'),
        meta: { title: 'Usuarios', requiresAuth: true, permission: Permiso.USUARIOS_VER },
      },
      {
        path: 'administracion/roles',
        name: 'roles',
        component: () => import('@/modules/roles/pages/RolesPage.vue'),
        meta: { title: 'Roles y permisos', requiresAuth: true, superadminOnly: true },
      },
      {
        path: 'administracion/sucursales',
        name: 'sucursales',
        component: () => import('@/modules/sucursales/pages/SucursalesPage.vue'),
        meta: { title: 'Sucursales', requiresAuth: true, permission: Permiso.SUCURSALES_VER },
      },
      {
        path: 'administracion/medios-pago',
        name: 'medios-pago',
        component: () => import('@/modules/medios-pago/pages/MediosPagoPage.vue'),
        meta: { title: 'Medios de pago', requiresAuth: true, permission: Permiso.MEDIOS_PAGO_VER },
      },
      {
        path: 'administracion/personas',
        name: 'personas',
        component: () => import('@/modules/personas/pages/PersonasPage.vue'),
        meta: { title: 'Clientes y proveedores', requiresAuth: true, permission: Permiso.PERSONAS_VER },
      },
      {
        path: 'operaciones/caja', name: 'operaciones-caja',
        component: () => import('@/modules/operaciones/pages/CajaPage.vue'),
        meta: { title: 'Caja', requiresAuth: true, permission: Permiso.CAJA_VER },
      },
      {
        path: 'operaciones/ingresos', name: 'operaciones-ingresos',
        component: () => import('@/modules/operaciones/pages/MovimientosPage.vue'),
        meta: { title: 'Ingresos', requiresAuth: true, permission: Permiso.CAJA_VER },
      },
      {
        path: 'operaciones/egresos', name: 'operaciones-egresos',
        component: () => import('@/modules/operaciones/pages/MovimientosPage.vue'),
        meta: { title: 'Egresos', requiresAuth: true, permission: Permiso.CAJA_VER },
      },
      {
        path: 'operaciones/ventas', name: 'operaciones-ventas',
        component: () => import('@/modules/operaciones/pages/VentasPage.vue'),
        meta: { title: 'Ventas', requiresAuth: true, permission: Permiso.VENTAS_VER },
      },
      {
        path: 'operaciones/compras', name: 'operaciones-compras',
        component: () => import('@/modules/operaciones/pages/ComprasPage.vue'),
        meta: { title: 'Compras', requiresAuth: true, permission: Permiso.COMPRAS_VER },
      },
      {
        path: 'operaciones/deudas', name: 'operaciones-deudas',
        component: () => import('@/modules/operaciones/pages/DeudasPage.vue'),
        meta: { title: 'Deudas de clientes', requiresAuth: true, permission: Permiso.DEUDAS_VER },
      },
      {
        path: 'operaciones/catalogos', name: 'operaciones-catalogos',
        component: () => import('@/modules/operaciones/pages/CatalogosPage.vue'),
        meta: { title: 'Catálogos operativos', requiresAuth: true, permissionsAny: [Permiso.CAJA_VER, Permiso.COMPRAS_VER] },
      },
      {
        path: 'logistica/catalogos', name: 'logistica-catalogos',
        component: () => import('@/modules/logistica/pages/CatalogosPage.vue'),
        meta: { title: 'Tipos y categorías', requiresAuth: true, permission: Permiso.LOGISTICA_VER },
      },
      {
        path: 'logistica/unidades-medida', name: 'logistica-unidades-medida',
        component: () => import('@/modules/logistica/pages/CatalogosPage.vue'),
        meta: { title: 'Unidades de medida', requiresAuth: true, permission: Permiso.LOGISTICA_VER },
      },
      {
        path: 'logistica/productos', name: 'logistica-productos',
        component: () => import('@/modules/logistica/pages/ProductosPage.vue'),
        meta: { title: 'Productos', requiresAuth: true, permission: Permiso.LOGISTICA_VER },
      },
      {
        path: 'logistica/almacenes', name: 'logistica-almacenes',
        component: () => import('@/modules/logistica/pages/AlmacenesPage.vue'),
        meta: { title: 'Almacenes', requiresAuth: true, permission: Permiso.LOGISTICA_VER },
      },
      {
        path: 'logistica/inventario', name: 'logistica-inventario',
        component: () => import('@/modules/logistica/pages/InventarioPage.vue'),
        meta: { title: 'Inventario', requiresAuth: true, permission: Permiso.LOGISTICA_VER },
      },
      {
        path: 'logistica/kardex', name: 'logistica-kardex',
        component: () => import('@/modules/logistica/pages/InventarioPage.vue'),
        meta: { title: 'Kardex', requiresAuth: true, permission: Permiso.LOGISTICA_VER },
      },
      {
        path: 'logistica/configuracion', name: 'logistica-configuracion',
        component: () => import('@/modules/logistica/pages/InventarioPage.vue'),
        meta: { title: 'Configuración logística', requiresAuth: true, superadminOnly: true },
      },
      {
        path: 'sin-acceso',
        name: 'sin-acceso',
        component: () => import('@/shared/components/feedback/AccessDeniedPage.vue'),
        meta: { title: 'Acceso restringido', requiresAuth: true },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]
