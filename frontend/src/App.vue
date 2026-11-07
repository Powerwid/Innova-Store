<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useUiStore } from '@/shared/stores/ui.store'
import { isAppThemeName } from '@/app/theme/themes'
import { useRealtimeStore } from '@/core/realtime/realtime.store'
import { useSucursalStore } from '@/shared/stores/sucursal.store'

const theme = useTheme()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()
const realtime = useRealtimeStore()
const branch = useSucursalStore()
watch(() => [authStore.usuario?.idUsuario, branch.idSucursalActual] as const, ([user, idSucursal]) => {
  if (user && idSucursal) realtime.connect(idSucursal)
  else realtime.disconnect()
}, { immediate: true })
onBeforeUnmount(() => realtime.disconnect())

watch(
  () => uiStore.themeName,
  (themeName) => {
    theme.change(isAppThemeName(themeName) ? themeName : 'storeEmerald')
  },
  { immediate: true },
)

function handleExpiredSession() {
  authStore.clearSession()
  void router.replace({ name: 'login', query: { reason: 'expired' } })
}

onMounted(() => window.addEventListener('auth:expired', handleExpiredSession))
onBeforeUnmount(() => window.removeEventListener('auth:expired', handleExpiredSession))
</script>
