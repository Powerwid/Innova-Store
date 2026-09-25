<template>
  <div class="dashboard-shell">
    <v-card class="dashboard-hero rounded-xl mb-6" elevation="0" border>
      <v-card-text class="pa-6 pa-md-8">
        <v-row align="center">
          <v-col cols="12" md="8">
            <v-chip color="primary" variant="tonal" class="mb-4">
              <v-icon start>mdi-view-dashboard-outline</v-icon>
              Panel administrativo
            </v-chip>
            <h1 class="text-h3 font-weight-bold mb-3">Hola, {{ firstName }}</h1>
            <p class="text-body-1 text-medium-emphasis dashboard-description">
              Administra la operación de {{ branchName }} desde un espacio central para usuarios, roles y sucursales.
            </p>
          </v-col>
          <v-col cols="12" md="4" class="d-flex justify-md-end">
            <div class="branch-context pa-5 rounded-xl">
              <div class="d-flex align-center ga-3">
                <v-avatar color="primary" variant="tonal" size="54" rounded="lg">
                  <v-icon size="28">mdi-store-outline</v-icon>
                </v-avatar>
                <div>
                  <div class="text-caption text-medium-emphasis">Sucursal actual</div>
                  <div class="text-h6 font-weight-bold">{{ branchName }}</div>
                  <div class="text-caption text-medium-emphasis">Contexto de operación</div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row class="mb-2" density="compact">
      <v-col v-for="metric in metrics" :key="metric.label" cols="12" sm="6" lg="3">
        <v-card class="metric-card rounded-xl h-100" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="d-flex align-start justify-space-between ga-3">
              <div>
                <div class="text-caption text-medium-emphasis mb-2">{{ metric.label }}</div>
                <div class="text-h6 font-weight-bold metric-value">{{ metric.value }}</div>
                <div class="text-caption text-medium-emphasis mt-2">{{ metric.detail }}</div>
              </div>
              <v-avatar :color="metric.color" variant="tonal" size="48" rounded="lg">
                <v-icon size="24">{{ metric.icon }}</v-icon>
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4" align="stretch">
      <v-col cols="12" lg="8">
        <v-card class="rounded-xl h-100" elevation="0" border>
          <v-card-item class="pa-5 pa-md-6 border-b">
            <template #prepend>
              <v-avatar color="primary" variant="tonal" rounded="lg" class="me-3">
                <v-icon>mdi-lightning-bolt-outline</v-icon>
              </v-avatar>
            </template>
            <v-card-title class="font-weight-bold">Accesos rápidos</v-card-title>
            <v-card-subtitle>Continúa con las tareas más frecuentes.</v-card-subtitle>
          </v-card-item>
          <v-card-text class="pa-5 pa-md-6">
            <v-row density="compact">
              <v-col v-for="item in quickAccess" :key="item.title" cols="12" md="4">
                <v-card :to="item.to" class="quick-card rounded-xl h-100" elevation="0" border>
                  <v-card-text class="pa-5">
                    <v-avatar color="primary" variant="tonal" rounded="lg" class="mb-4">
                      <v-icon>{{ item.icon }}</v-icon>
                    </v-avatar>
                    <div class="text-subtitle-1 font-weight-bold">{{ item.title }}</div>
                    <div class="text-body-2 text-medium-emphasis mt-1">{{ item.description }}</div>
                    <div class="d-flex align-center text-primary text-body-2 font-weight-bold mt-5">
                      Ingresar<v-icon size="18" class="ms-1">mdi-arrow-right</v-icon>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="rounded-xl h-100" elevation="0" border>
          <v-card-item class="pa-5 pa-md-6 border-b">
            <template #prepend>
              <v-avatar color="info" variant="tonal" rounded="lg" class="me-3">
                <v-icon>mdi-information-outline</v-icon>
              </v-avatar>
            </template>
            <v-card-title class="font-weight-bold">Información del sistema</v-card-title>
          </v-card-item>
          <v-card-text class="pa-5 pa-md-6">
            <div class="info-row mb-3"><span class="text-medium-emphasis">Usuario</span><strong>{{ firstName }}</strong>
            </div>
            <div class="info-row mb-3">
              <span class="text-medium-emphasis">Perfil</span>
              <v-chip color="primary" size="small" variant="tonal">{{ roleName }}</v-chip>
            </div>
            <div class="info-row mb-3">
              <span class="text-medium-emphasis">Sucursales disponibles</span>
              <strong>{{ authStore.usuario?.sucursales.length ?? 0 }}</strong>
            </div>
            <div class="info-row"><span class="text-medium-emphasis">Versión</span><strong>1.0.0</strong></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Permiso } from '@/core/constants/permisos'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useSucursalStore } from '@/shared/stores/sucursal.store'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const firstName = computed(() => authStore.usuario?.correo.split('@')[0] || 'Usuario')
const branchName = computed(() => sucursalStore.sucursalActual?.nombre || 'Sin sucursal')
const roleName = computed(() => authStore.usuario?.rol.nombre || 'Usuario')

const metrics = computed(() => [
  { label: 'Sucursal', value: branchName.value, detail: 'Contexto seleccionado', icon: 'mdi-store-outline', color: 'primary' },
  { label: 'Rol', value: roleName.value, detail: 'Perfil de acceso', icon: 'mdi-shield-account-outline', color: 'info' },
  { label: 'Permisos', value: authStore.usuario?.permisos.length ?? 0, detail: 'Capacidades habilitadas', icon: 'mdi-key-outline', color: 'success' },
  { label: 'Estado de cuenta', value: authStore.usuario?.estado || '—', detail: 'Disponibilidad administrativa', icon: 'mdi-check-decagram-outline', color: 'success' },
])

const quickAccess = computed(() => [
  { title: 'Usuarios', description: 'Administra cuentas, roles y accesos.', icon: 'mdi-account-group-outline', to: { name: 'usuarios' }, visible: authStore.puede(Permiso.USUARIOS_VER) },
  { title: 'Sucursales', description: 'Gestiona las tiendas de la empresa.', icon: 'mdi-store-outline', to: { name: 'sucursales' }, visible: authStore.puede(Permiso.SUCURSALES_VER) },
  { title: 'Roles', description: 'Configura roles y sus permisos.', icon: 'mdi-account-key-outline', to: { name: 'roles' }, visible: authStore.esSuperadmin },
].filter((item) => item.visible))
</script>

<style scoped>
.dashboard-shell {
  max-width: 1600px;
  margin: 0 auto;
}

.dashboard-hero {
  background: linear-gradient(125deg, rgba(var(--v-theme-primary), 0.12), rgba(var(--v-theme-surface), 1) 62%);
}

.dashboard-description {
  max-width: 760px;
}

.branch-context {
  min-width: min(100%, 330px);
  background: rgba(var(--v-theme-on-surface), 0.045);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.metric-card {
  min-height: 148px;
}

.metric-value {
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-card {
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.quick-card:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.55);
}

.info-row {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.045);
}
</style>
