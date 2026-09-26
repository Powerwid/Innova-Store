<template>
  <div class="roles-page">
    <v-card class="mb-6 rounded-xl shadow-sm" elevation="0" border
      ><v-card-text class="d-flex flex-wrap align-center ga-3 pa-4">
        <v-text-field
          v-model="searchRole"
          placeholder="Buscar rol..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          hide-details
          clearable
          class="role-search"
        />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          rounded="lg"
          @click="openCreate"
          >Nuevo Rol</v-btn
        >
        <span class="text-body-2 text-medium-emphasis"
          ><v-icon size="19" class="me-1">mdi-shield-account</v-icon
          >{{ roles.length }} roles</span
        >
      </v-card-text></v-card
    >
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4 rounded-xl"
      closable
      @click:close="error = ''"
      >{{ error }}</v-alert
    >
    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="58" />
    </div>
    <v-row v-else>
      <v-col cols="12" md="4" lg="3"
        ><v-card class="rounded-xl shadow-sm" elevation="0" border>
          <v-list color="primary" class="pa-2"
            ><v-list-subheader class="font-weight-bold text-primary"
              >ROLES DEL SISTEMA</v-list-subheader
            >
            <v-list-item
              v-for="role in filteredRoles"
              :key="role.idRol"
              :active="selectedId === role.idRol"
              rounded="lg"
              class="my-1"
              @click="selectRole(role)"
            >
              <template #prepend
                ><v-avatar color="primary" variant="tonal" size="34"
                  ><v-icon size="19">mdi-account-group</v-icon></v-avatar
                ></template
              >
              <v-list-item-title class="font-weight-bold">{{
                role.nombre
              }}</v-list-item-title
              ><v-list-item-subtitle
                >{{ role.cantidadPermisos }} permisos ·
                {{ role.cantidadUsuarios }} usuarios</v-list-item-subtitle
              >
            </v-list-item>
            <v-list-item
              v-if="!filteredRoles.length"
              title="No se encontraron roles"
            />
          </v-list> </v-card
      ></v-col>
      <v-col cols="12" md="8" lg="9"
        ><v-card
          v-if="selectedRole"
          class="rounded-xl shadow-sm overflow-hidden"
          elevation="0"
          border
        >
          <div class="role-header">
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                <v-icon color="primary" class="me-2">mdi-shield-check</v-icon
                >Permisos:
                <span class="text-primary">{{ selectedRole.nombre }}</span>
              </div>
              <div class="text-caption text-medium-emphasis ms-8">
                {{ selectedRole.cantidadUsuarios }} usuarios usan este rol
              </div>
            </div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip color="primary" variant="tonal" size="small"
                >{{ selectedPermissions.length }} activos</v-chip
              ><v-btn
                color="error"
                variant="tonal"
                size="small"
                prepend-icon="mdi-delete-outline"
                :disabled="selectedRole.cantidadUsuarios > 0"
                @click="confirmDelete = true"
                >Eliminar</v-btn
              ><v-btn
                color="primary"
                size="small"
                prepend-icon="mdi-content-save"
                :loading="saving"
                @click="savePermissions"
                >Guardar cambios</v-btn
              >
            </div>
          </div>
          <v-card-text class="pa-4"
            ><v-alert type="info" variant="tonal" density="compact" class="mb-4"
              >El permiso «Ver» habilita el módulo en el menú. Los cambios
              afectan a todos los usuarios con este rol.</v-alert
            >
            <v-text-field
              v-model="searchPermission"
              placeholder="Buscar permiso..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              clearable
              class="mb-4"
            />
            <div
              v-for="group in permissionGroups"
              :key="group.name"
              class="mb-5"
            >
              <div class="text-subtitle-2 font-weight-bold mb-2">
                {{ group.name }}
              </div>
              <v-row density="compact">
                <v-col
                  v-for="permission in group.items"
                  :key="permission.idPermiso"
                  cols="12"
                  sm="6"
                  lg="4"
                  ><div class="permission-cell">
                    <v-checkbox-btn
                      v-model="selectedPermissions"
                      :value="permission.idPermiso"
                      color="primary"
                      :label="permission.etiqueta"
                      class="flex-grow-1"
                    /></div
                ></v-col>
              </v-row>
            </div>
            <div
              v-if="!permissionGroups.length"
              class="text-center text-medium-emphasis py-8"
            >
              No se encontraron permisos
            </div>
          </v-card-text></v-card
        ><v-card
          v-else
          class="rounded-xl text-center pa-12"
          elevation="0"
          border
          ><v-avatar size="72" color="primary" variant="tonal"
            ><v-icon size="40">mdi-shield-account-outline</v-icon></v-avatar
          >
          <div class="text-h6 mt-4">Gestión de accesos</div>
          <p class="text-medium-emphasis">
            Selecciona un rol para administrar sus permisos
          </p></v-card
        ></v-col
      >
    </v-row>
    <v-dialog v-model="roleDialog" max-width="430" persistent
      ><v-card rounded="xl"
        ><v-card-title class="pa-5 bg-primary text-white">Nuevo Rol</v-card-title
        ><v-card-text class="pa-5"
          ><v-alert
            v-if="dialogError"
            type="error"
            variant="tonal"
            class="mb-3"
            >{{ dialogError }}</v-alert
          ><v-text-field
            v-model="roleName"
            label="Nombre del rol"
            hint="Letras, números y guiones bajos"
            persistent-hint
            variant="outlined"
            @keyup.enter="saveRole" /></v-card-text
        ><v-card-actions class="pa-4 justify-end"
          ><v-btn variant="text" @click="roleDialog = false">Cancelar</v-btn
          ><v-btn color="primary" :loading="saving" @click="saveRole"
            >Guardar</v-btn
          ></v-card-actions
        ></v-card
      ></v-dialog
    >
    <v-dialog v-model="confirmDelete" max-width="430"
      ><v-card rounded="xl"
        ><v-card-title class="pa-5">Eliminar rol</v-card-title
        ><v-card-text
          >¿Eliminar el rol {{ selectedRole?.nombre }}? Esta acción no se puede
          deshacer.</v-card-text
        ><v-card-actions class="pa-4 justify-end"
          ><v-btn variant="text" @click="confirmDelete = false">Cancelar</v-btn
          ><v-btn color="error" :loading="saving" @click="deleteRole"
            >Eliminar</v-btn
          ></v-card-actions
        ></v-card
      ></v-dialog
    >
    <v-snackbar v-model="noticeVisible" color="success">{{
      notice
    }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { rolesApi } from "@/core/api/administracion.api";
import { getApiErrorMessage } from "@/core/api/api-error";
import type {
  PermisoRegistro,
  RolRegistro,
} from "@/core/types/administracion.types";

const roles = ref<RolRegistro[]>([]),
  permissions = ref<PermisoRegistro[]>([]);
const selectedId = ref<number | null>(null),
  selectedPermissions = ref<number[]>([]);
const searchRole = ref(""),
  searchPermission = ref(""),
  roleName = ref("");
const loading = ref(true),
  saving = ref(false),
  roleDialog = ref(false),
  confirmDelete = ref(false);
const error = ref(""),
  dialogError = ref(""),
  notice = ref(""),
  noticeVisible = ref(false);
const selectedRole = computed(
  () => roles.value.find((role) => role.idRol === selectedId.value) ?? null,
);
const filteredRoles = computed(() =>
  roles.value.filter((role) =>
    role.nombre.toLowerCase().includes((searchRole.value || "").toLowerCase()),
  ),
);
const permissionGroups = computed(() => {
  const matching = permissions.value.filter((p) =>
    `${p.modulo} ${p.etiqueta} ${p.nombre}`
      .toLowerCase()
      .includes((searchPermission.value || "").toLowerCase()),
  );
  return [...new Set(matching.map((p) => p.modulo))].map((name) => ({
    name,
    items: matching.filter((p) => p.modulo === name),
  }));
});
function selectRole(role: RolRegistro) {
  selectedId.value = role.idRol;
  selectedPermissions.value = role.permisos.map((p) => p.idPermiso);
}
async function load(preferredId?: number) {
  loading.value = true;
  error.value = "";
  try {
    const [r, p] = await Promise.all([rolesApi.listar(), rolesApi.permisos()]);
    roles.value = r.data;
    permissions.value = p.data;
    const next =
      roles.value.find(
        (role) => role.idRol === (preferredId ?? selectedId.value),
      ) ?? roles.value[0];
    if (next) selectRole(next);
    else {
      selectedId.value = null;
      selectedPermissions.value = [];
    }
  } catch (e) {
    error.value = getApiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
function openCreate() {
  roleName.value = "";
  dialogError.value = "";
  roleDialog.value = true;
}
async function saveRole() {
  dialogError.value = "";
  const name = roleName.value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{2,49}$/.test(name)) {
    dialogError.value =
      "Usa al menos 3 caracteres: letras, números y guiones bajos";
    return;
  }
  saving.value = true;
  try {
    const response = await rolesApi.crear(name);
    roleDialog.value = false;
    notice.value = response.data.message;
    noticeVisible.value = true;
    await load(response.data.rol.idRol);
  } catch (e) {
    dialogError.value = getApiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}
async function deleteRole() {
  if (!selectedId.value) return;
  saving.value = true;
  try {
    const { data } = await rolesApi.eliminar(selectedId.value);
    confirmDelete.value = false;
    selectedId.value = null;
    notice.value = data.message;
    noticeVisible.value = true;
    await load();
  } catch (e) {
    error.value = getApiErrorMessage(e);
    confirmDelete.value = false;
  } finally {
    saving.value = false;
  }
}
async function savePermissions() {
  if (!selectedId.value) return;
  saving.value = true;
  error.value = "";
  try {
    const { data } = await rolesApi.sincronizarPermisos(
      selectedId.value,
      selectedPermissions.value,
    );
    notice.value = data.message;
    noticeVisible.value = true;
    await load(selectedId.value);
  } catch (e) {
    error.value = getApiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}
onMounted(() => load());
</script>

<style scoped>
.roles-page {
  max-width: 1600px;
  margin: 0 auto;
}
.role-search {
  flex: 1 1 260px;
  max-width: 500px;
}
.role-header {
  padding: 18px 22px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.permission-cell {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.045);
}
</style>
