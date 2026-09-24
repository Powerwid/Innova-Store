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
        path: 'sin-acceso',
        name: 'sin-acceso',
        component: () => import('@/shared/components/feedback/AccessDeniedPage.vue'),
        meta: { title: 'Acceso restringido', requiresAuth: true },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]
