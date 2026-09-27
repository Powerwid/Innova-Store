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
