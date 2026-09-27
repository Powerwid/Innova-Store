<template>
  <v-navigation-drawer v-model="drawer" :rail="rail && !settingsMode && !mobile"
    :expand-on-hover="rail && !settingsMode && !mobile" :permanent="!mobile" :temporary="mobile" elevation="2"
    class="app-sidebar border-none">
    <template v-if="!settingsMode">
      <v-list>
        <v-list-item :title="userName" :subtitle="authStore.usuario?.correo || 'Sesión activa'" class="pa-4 mb-1">
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="42">
              <span class="text-caption font-weight-bold">{{ authStore.iniciales }}</span>
            </v-avatar>
          </template>
          <template #append>
            <v-tooltip v-if="!mobile" :text="rail ? 'Fijar menú abierto' : 'Modo compacto'" location="end">
              <template #activator="{ props }">
                <v-btn v-bind="props" variant="text" :icon="rail ? 'mdi-pin-off-outline' : 'mdi-pin-outline'"
                  size="small" color="medium-emphasis" @click.stop="rail = !rail" />
              </template>
            </v-tooltip>
          </template>
        </v-list-item>
      </v-list>

      <v-divider class="mb-2" />

      <v-list v-model:opened="openedGroups" density="compact" nav slim class="menu-erp">
        <v-list-item prepend-icon="mdi-view-dashboard-outline" title="Dashboard" :to="{ name: 'dashboard' }" exact
          rounded="lg" color="primary" class="mb-1" @click="onNavigate" />

        <template v-for="item in visibleMenu" :key="item.key">
          <v-list-item v-if="!item.children" :prepend-icon="item.icon" :title="item.title" :to="item.to" rounded="lg"
            color="primary" class="mb-1" @click="onNavigate" />

          <v-list-group v-else :value="item.key" class="menu-group"
            :class="{ 'menu-group--open': openedGroups.includes(item.key) }">
            <template #activator="{ props, isOpen }">
              <v-list-item v-bind="props" :prepend-icon="item.icon" :title="item.title"
                :active="isGroupActive(item) && !isOpen" rounded="lg" color="primary"
                class="mb-1 menu-group__activator" />
            </template>
            <div class="menu-group__children">
              <v-list-item v-for="child in item.children" :key="child.title" :prepend-icon="child.icon"
                :title="child.title" :to="child.to" rounded="lg" color="primary" density="compact"
                @click="onNavigate" />
            </div>
          </v-list-group>
        </template>

        <div v-if="visibleMenu.length === 0" class="text-center text-caption text-medium-emphasis pa-4">
          No tienes módulos disponibles con tu rol actual.
        </div>
      </v-list>
    </template>

    <template v-else>
      <div class="pa-4 pb-2">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon color="primary" size="28" class="me-3">mdi-tune-variant</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">Configuración</div>
              <div class="text-caption text-medium-emphasis">Personaliza tu experiencia</div>
            </div>
          </div>
          <v-btn variant="text" icon="mdi-close" size="small" color="medium-emphasis" @click="closeSettings" />
        </div>
      </div>

      <v-divider class="mb-3" />

      <v-list density="compact" nav slim class="pa-3">
        <v-list-item prepend-icon="mdi-account-circle-outline" title="Mi perfil" subtitle="Cambiar contraseña"
          rounded="lg" color="primary" class="mb-3 profile-btn" style="background: rgba(var(--v-theme-primary), 0.06)"
          @click="passwordDialog = true">
          <template #append><v-icon size="20" color="primary">mdi-chevron-right</v-icon></template>
        </v-list-item>

        <v-divider class="my-4" />

        <div class="px-1 py-1">
          <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3 d-flex align-center">
            <v-icon size="16" class="me-2" color="primary">mdi-palette-outline</v-icon>
            Temas disponibles
          </div>
          <v-row dense class="ma-0">
            <v-col v-for="option in themeOptions" :key="option.value" cols="6" class="pa-1">
              <v-card variant="flat" rounded="lg" class="theme-card pa-2 cursor-pointer"
                :class="{ 'theme-active': uiStore.themeName === option.value }" role="button"
                :aria-pressed="uiStore.themeName === option.value" tabindex="0" @click="uiStore.setTheme(option.value)"
                @keydown.enter="uiStore.setTheme(option.value)" @keydown.space.prevent="uiStore.setTheme(option.value)">
                <div class="d-flex align-center">
                  <v-avatar :color="option.primary" size="14" rounded="sm" class="me-2" />
                  <span class="text-caption font-weight-medium theme-card__label"
                    :class="{ 'text-primary': uiStore.themeName === option.value }">
                    {{ option.label }}
                  </span>
                  <v-spacer />
                  <v-icon v-if="uiStore.themeName === option.value" size="14" color="primary">mdi-check-circle</v-icon>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <v-divider class="my-4" />

        <div class="px-2 py-1">
          <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3 d-flex align-center">
            <v-icon size="16" class="me-2" color="primary">mdi-account-details-outline</v-icon>
            Información de la cuenta
          </div>
          <div class="user-info-card pa-3 rounded-lg" style="background: rgba(var(--v-theme-primary), 0.04)">
            <div class="d-flex align-center mb-2">
              <v-avatar size="32" color="primary" variant="tonal" class="me-2"><v-icon
                  size="16">mdi-store-outline</v-icon></v-avatar>
              <div class="min-w-0">
                <div class="text-caption text-medium-emphasis">Sucursal</div>
                <div class="text-body-2 font-weight-medium text-truncate">{{ currentBranchName }}</div>
              </div>
            </div>
            <div class="d-flex align-center mb-2">
              <v-avatar size="32" color="primary" variant="tonal" class="me-2"><v-icon
                  size="16">mdi-account</v-icon></v-avatar>
              <div>
                <div class="text-caption text-medium-emphasis">Usuario</div>
                <div class="text-body-2 font-weight-medium">{{ userName }}</div>
              </div>
            </div>
            <div class="d-flex align-center">
              <v-avatar size="32" color="primary" variant="tonal" class="me-2"><v-icon
                  size="16">mdi-email</v-icon></v-avatar>
              <div class="min-w-0">
                <div class="text-caption text-medium-emphasis">Correo</div>
                <div class="text-body-2 font-weight-medium text-truncate" style="max-width: 180px">{{
                  authStore.usuario?.correo
                }}</div>
              </div>
            </div>
          </div>
        </div>

        <v-divider class="my-4" />

        <div class="px-2 py-1 d-flex align-center justify-space-between">
          <div class="text-caption text-medium-emphasis d-flex align-center">
            <v-icon size="14" class="me-1">mdi-information-outline</v-icon>Versión 1.0.0
          </div>
          <v-chip size="x-small" color="success" variant="tonal">
            <v-icon size="12" class="me-1">mdi-check-circle</v-icon>Activo
          </v-chip>
        </div>
      </v-list>
    </template>
  </v-navigation-drawer>

  <v-app-bar flat border color="surface" class="px-2">
    <v-app-bar-nav-icon color="primary" :aria-label="drawer ? 'Cerrar menú' : 'Abrir menú'" @click="toggleDrawer" />

    <div class="d-none d-sm-flex align-center">
      <v-avatar color="primary" variant="tonal" class="me-3 ms-2" rounded="lg" size="40">
        <v-icon icon="mdi-vector-combine" color="primary" />
      </v-avatar>
      <div class="text-subtitle-1 text-md-h6 font-weight-bold text-truncate">
        {{ route.meta.title || 'Panel de control' }}
      </div>
    </div>

    <v-spacer />

    <div class="d-flex align-center ga-1 md:ga-2">
      <v-menu v-if="sucursalStore.sucursales.length" :close-on-content-click="true" location="bottom end" :offset="8">
        <template #activator="{ props }">
          <v-btn v-bind="props" color="primary" variant="tonal" class="rounded-lg px-2 md:px-4"
            :size="mobile ? 'small' : 'default'" :disabled="sucursalStore.sucursales.length <= 1">
            <v-icon size="20">mdi-store-outline</v-icon>
            <span class="d-none d-md-inline font-weight-medium text-caption text-truncate ms-1"
              style="max-width: 120px">
              {{ currentBranchName }}
            </span>
          </v-btn>
        </template>
        <v-list class="py-2 rounded-lg" min-width="220">
          <v-list-item v-for="branch in sucursalStore.sucursales" :key="branch.idSucursal"
            :active="branch.idSucursal === sucursalStore.idSucursalActual" rounded="lg" class="mx-1"
            @click="sucursalStore.seleccionar(branch.idSucursal)">
            <template #prepend><v-icon size="18">mdi-store-outline</v-icon></template>
            <v-list-item-title class="text-body-2">{{ branch.nombre }}</v-list-item-title>
            <template v-if="branch.idSucursal === sucursalStore.idSucursalActual" #append>
              <v-icon size="16" color="success">mdi-check-circle</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-tooltip text="Configuración" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" :color="settingsMode ? 'primary' : 'medium-emphasis'"
            :variant="settingsMode ? 'tonal' : 'text'" icon="mdi-account-cog-outline"
            :size="mobile ? 'small' : 'default'" class="rounded-lg" @click="toggleSettings" />
        </template>
      </v-tooltip>

      <v-tooltip text="Cerrar sesión" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" color="error" variant="tonal" icon="mdi-logout" :size="mobile ? 'small' : 'default'"
            class="rounded-lg" @click="handleLogout" />
        </template>
      </v-tooltip>
    </div>
  </v-app-bar>

  <v-main>
    <v-container fluid class="pa-4 pa-md-6">
      <router-view v-slot="{ Component }">
        <v-fade-transition mode="out-in">
          <component :is="Component" />
        </v-fade-transition>
      </router-view>
    </v-container>
  </v-main>
  <v-dialog v-model="passwordDialog" max-width="480" persistent>
    <v-card rounded="xl"><v-card-title class="pa-5 bg-primary text-white"><v-icon
          class="me-2">mdi-lock-reset</v-icon>Cambiar contraseña</v-card-title>
      <v-card-text class="pa-5"><v-alert v-if="passwordError" type="error" variant="tonal" class="mb-4">{{ passwordError
      }}</v-alert>
        <v-text-field v-model="passwordForm.actual" label="Contraseña actual" type="password"
          autocomplete="current-password" variant="outlined" />
        <v-text-field v-model="passwordForm.nueva" label="Nueva contraseña" type="password" autocomplete="new-password"
          hint="Mínimo 8 caracteres, una mayúscula y un número" persistent-hint variant="outlined" />
        <v-text-field v-model="passwordForm.confirmacion" label="Confirmar contraseña" type="password"
          autocomplete="new-password" variant="outlined" />
      </v-card-text><v-card-actions class="pa-4 justify-end"><v-btn variant="text"
          @click="passwordDialog = false">Cancelar</v-btn><v-btn color="primary" :loading="passwordSaving"
          @click="changePassword">Guardar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar v-model="passwordNotice" color="success">Contraseña actualizada</v-snackbar>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { themeOptions } from '@/app/theme/themes'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useSucursalStore } from '@/shared/stores/sucursal.store'
import { useUiStore } from '@/shared/stores/ui.store'
import { Permiso } from '@/core/constants/permisos'
import { sucursalesApi } from '@/core/api/administracion.api'
import { authApi } from '@/modules/auth/api/auth.api'
import { getApiErrorMessage } from '@/core/api/api-error'

interface MenuItem {
  key: string
  title: string
  icon: string
  to?: { name: string }
  permission?: string
  superadminOnly?: boolean
  children?: MenuItem[]
}

const route = useRoute()
const router = useRouter()
const { mobile } = useDisplay()
const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const uiStore = useUiStore()
const drawer = ref(!mobile.value)
const rail = ref(false)
const settingsMode = ref(false)
const openedGroups = ref<string[]>([])
const passwordDialog = ref(false)
const passwordSaving = ref(false)
const passwordError = ref('')
const passwordNotice = ref(false)
const passwordForm = reactive({ actual: '', nueva: '', confirmacion: '' })

const userName = computed(() => authStore.usuario?.correo.split('@')[0] || 'Usuario')
const currentBranchName = computed(() => sucursalStore.sucursalActual?.nombre || 'Sin sucursal')

const menuConfig: MenuItem[] = [
  {
    key: 'logistica', title: 'Logística', icon: 'mdi-package-variant-closed',
    children: [
      { key: 'logistica-productos', title: 'Productos', icon: 'mdi-package-variant', to: { name: 'logistica-productos' }, permission: Permiso.LOGISTICA_VER },
      { key: 'logistica-catalogos', title: 'Tipos y categorías', icon: 'mdi-shape-outline', to: { name: 'logistica-catalogos' }, permission: Permiso.LOGISTICA_VER },
      { key: 'logistica-unidades-medida', title: 'Unidades de medida', icon: 'mdi-ruler-square', to: { name: 'logistica-unidades-medida' }, permission: Permiso.LOGISTICA_VER },
      { key: 'logistica-almacenes', title: 'Almacenes', icon: 'mdi-warehouse', to: { name: 'logistica-almacenes' }, permission: Permiso.LOGISTICA_VER },
      { key: 'logistica-inventario', title: 'Inventario', icon: 'mdi-clipboard-list-outline', to: { name: 'logistica-inventario' }, permission: Permiso.LOGISTICA_VER },
      { key: 'logistica-kardex', title: 'Kardex', icon: 'mdi-history', to: { name: 'logistica-kardex' }, permission: Permiso.LOGISTICA_VER },
      { key: 'logistica-configuracion', title: 'Configuración', icon: 'mdi-cog-outline', to: { name: 'logistica-configuracion' }, superadminOnly: true },
    ],
  },
  {
    key: 'administracion',
    title: 'Administración',
    icon: 'mdi-shield-account-outline',
    children: [
      {
        key: 'usuarios',
        title: 'Usuarios',
        icon: 'mdi-account-group-outline',
        to: { name: 'usuarios' },
        permission: Permiso.USUARIOS_VER
      },
      {
        key: 'personas',
        title: 'Clientes y proveedores',
        icon: 'mdi-account-multiple-outline',
        to: { name: 'personas' },
        permission: Permiso.PERSONAS_VER,
      },
      {
        key: 'sucursales',
        title: 'Sucursales',
        icon: 'mdi-store-outline',
        to: { name: 'sucursales' },
        permission: Permiso.SUCURSALES_VER
      },
      {
        key: 'roles',
        title: 'Roles y permisos',
        icon: 'mdi-account-key-outline',
        to: { name: 'roles' }, superadminOnly: true
      },

      {
        key: 'medios-pago',
        title: 'Medios de pago',
        icon: 'mdi-credit-card-outline',
        to: { name: 'medios-pago' },
        permission: Permiso.MEDIOS_PAGO_VER
      },
    ],
  },
]

function canSee(item: MenuItem) {
  if (item.superadminOnly) return authStore.esSuperadmin
  return authStore.puede(item.permission)
}

const visibleMenu = computed(() =>
  menuConfig
    .map((item) => {
      if (!item.children) return canSee(item) ? item : null
      const children = item.children.filter(canSee)
      return children.length ? { ...item, children } : null
    })
    .filter((item): item is MenuItem => item !== null),
)

function isGroupActive(item: MenuItem) {
  return item.children?.some((child) => child.to?.name === route.name) === true
}

function syncOpenedGroupWithRoute() {
  const active = menuConfig.find(isGroupActive)
  if (active && !openedGroups.value.includes(active.key)) openedGroups.value = [active.key]
}

function onNavigate() {
  if (mobile.value) drawer.value = false
}

function toggleDrawer() {
  if (settingsMode.value) return closeSettings()
  if (mobile.value) drawer.value = !drawer.value
  else rail.value = !rail.value
}

function toggleSettings() {
  settingsMode.value = !settingsMode.value
  if (settingsMode.value) drawer.value = true
}

function closeSettings() {
  settingsMode.value = false
}

async function handleLogout() {
  await authStore.logout()
  await router.replace({ name: 'login', query: { reason: 'logout' } })
}

async function changePassword() {
  passwordError.value = ''
  if (passwordForm.nueva !== passwordForm.confirmacion) { passwordError.value = 'La confirmación no coincide'; return }
  passwordSaving.value = true
  try {
    await authApi.cambiarContrasena({ contrasenaActual: passwordForm.actual, contrasenaNueva: passwordForm.nueva })
    passwordDialog.value = false
    Object.assign(passwordForm, { actual: '', nueva: '', confirmacion: '' })
    passwordNotice.value = true
  } catch (error) { passwordError.value = getApiErrorMessage(error) }
  finally { passwordSaving.value = false }
}

onMounted(async () => {
  if (!authStore.puede(Permiso.SUCURSALES_VER)) return
  try { const { data } = await sucursalesApi.listar(); sucursalStore.actualizarNombres(data.map(({ idSucursal, nombre }) => ({ idSucursal, nombre }))) } catch { /* El menú conserva los identificadores si falla el catálogo. */ }
})

watch(mobile, (value) => { drawer.value = !value })
watch(() => route.name, syncOpenedGroupWithRoute, { immediate: true })
watch(
  () => authStore.usuario?.sucursales ?? [],
  (ids) => sucursalStore.sincronizar(ids),
  { immediate: true },
)
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.theme-card {
  color: rgb(var(--v-theme-on-surface)) !important;
  background: rgba(var(--v-theme-on-surface), 0.055) !important;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.theme-card:hover {
  transform: translateY(-2px);
  background: rgba(var(--v-theme-primary), 0.09) !important;
}

.theme-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.theme-active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12) !important;
}

.theme-card__label {
  color: rgb(var(--v-theme-on-surface));
}

.user-info-card,
.profile-btn {
  transition: all 0.3s ease;
}

.profile-btn:hover {
  transform: translateX(4px);
}

.menu-erp :deep(.v-list-item--active) {
  font-weight: 600;
}

.menu-group__children {
  position: relative;
  margin: 2px 0 4px 12px;
  padding-left: 6px;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.18);
}

.menu-group__children :deep(.v-list-item) {
  padding-inline-start: 8px !important;
}

.menu-group__children :deep(.v-list-item-title) {
  font-size: 0.8125rem;
  opacity: 0.85;
}

.menu-group__children :deep(.v-icon) {
  font-size: 18px;
}

.menu-group__children:hover {
  border-left-color: rgba(var(--v-theme-primary), 0.35);
}

.menu-group__children :deep(.v-list-item--active) {
  position: relative;
}

.menu-group__children :deep(.v-list-item--active)::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 3px;
  background: rgb(var(--v-theme-primary));
}

.menu-group--open .menu-group__activator {
  background: rgba(var(--v-theme-primary), 0.06);
}

.app-sidebar.v-navigation-drawer--rail :deep(.v-navigation-drawer__content) {
  scrollbar-width: none;
}
</style>
