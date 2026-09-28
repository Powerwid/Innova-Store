import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth/auth.store'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.inicializar()

  if (to.meta.guestOnly && authStore.autenticado) return { name: 'dashboard' }

  if (to.meta.requiresAuth && !authStore.autenticado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.superadminOnly && !authStore.esSuperadmin) return { name: 'sin-acceso' }
  if (to.meta.permission && !authStore.puede(to.meta.permission)) return { name: 'sin-acceso' }
  if (to.meta.permissionsAny?.length && !to.meta.permissionsAny.some((permission) => authStore.puede(permission))) {
    return { name: 'sin-acceso' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | Innova Store` : 'Innova Store'
})

export default router
