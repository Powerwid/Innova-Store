import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { RolSistema } from '@/core/constants/permisos'
import type { LoginPayload, UsuarioAutenticado } from '@/core/types/auth.types'
import { authApi } from './api/auth.api'

const SESSION_MARKER = 'innova-store:session-active'

export const useAuthStore = defineStore('auth', () => {
  const usuario = ref<UsuarioAutenticado | null>(null)
  const inicializado = ref(false)
  const cargando = ref(false)
  let initializationPromise: Promise<boolean> | null = null

  const autenticado = computed(() => usuario.value !== null)
  const esSuperadmin = computed(() => usuario.value?.rol.nombre === RolSistema.SUPERADMIN)
  const iniciales = computed(() => {
    const base = usuario.value?.correo.split('@')[0] || 'IS'
    return base.slice(0, 2).toUpperCase()
  })

  function puede(permiso?: string) {
    if (!permiso) return true
    return esSuperadmin.value || usuario.value?.permisos.includes(permiso) === true
  }

  async function cargarUsuario() {
    const { data } = await authApi.me()
    usuario.value = data
    localStorage.setItem(SESSION_MARKER, 'true')
    return data
  }

  async function inicializar(force = false) {
    if (inicializado.value && !force) return autenticado.value
    if (initializationPromise) return initializationPromise

    initializationPromise = (async () => {
      try {
        await cargarUsuario()
        return true
      } catch {
        usuario.value = null
        localStorage.removeItem(SESSION_MARKER)
        return false
      } finally {
        inicializado.value = true
        initializationPromise = null
      }
    })()

    return initializationPromise
  }

  async function login(payload: LoginPayload) {
    cargando.value = true
    try {
      await authApi.login(payload)
      await cargarUsuario()
      inicializado.value = true
    } finally {
      cargando.value = false
    }
  }

  async function logout() {
    cargando.value = true
    try {
      await authApi.logout()
    } finally {
      clearSession()
      cargando.value = false
    }
  }

  function clearSession() {
    usuario.value = null
    inicializado.value = true
    localStorage.removeItem(SESSION_MARKER)
  }

  return {
    usuario,
    inicializado,
    cargando,
    autenticado,
    esSuperadmin,
    iniciales,
    puede,
    inicializar,
    login,
    logout,
    clearSession,
  }
})
