<template>
  <div class="admin-page">
    <v-card class="mb-6 rounded-xl shadow-sm" elevation="0" border
      ><v-card-text class="filter-bar pa-4">
        <v-text-field
          v-model="search"
          placeholder="Buscar usuario..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          hide-details
          clearable
          class="filter-search"
        />
        <v-select
          v-model="statusFilter"
          :items="['Todos', 'ACTIVO', 'INACTIVO', 'BLOQUEADO']"
          label="Estado"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          hide-details
          class="filter-select"
        />
        <v-btn
          v-if="auth.puede(Permiso.USUARIOS_CREAR)"
          color="primary"
          prepend-icon="mdi-plus"
          rounded="lg"
          @click="openCreate"
          >Nuevo Usuario</v-btn
        >
        <span class="text-body-2 text-medium-emphasis"
          ><v-icon size="19" class="me-1">mdi-account</v-icon
          >{{ filtered.length }} usuarios</span
        >
      </v-card-text></v-card
    >
    <v-alert
      v-if="pageError"
      type="error"
      variant="tonal"
      class="mb-4 rounded-xl"
      closable
      @click:close="pageError = ''"
      >{{ pageError }}</v-alert
    >
    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="58" />
    </div>
    <template v-else>
      <div class="admin-mobile-list">
        <v-card
          v-for="user in filtered"
          :key="user.idUsuario"
          class="rounded-xl mb-3"
          elevation="0"
          border
        >
          <v-card-text class="pa-4"
            ><div class="d-flex align-center ga-3 mb-3">
              <v-avatar color="primary" variant="tonal">{{
                initials(user)
              }}</v-avatar>
              <div class="flex-grow-1">
                <strong>{{ fullName(user) }}</strong>
                <div class="text-caption text-medium-emphasis">
                  {{ user.correo }}
                </div>
              </div>
              <v-chip
                :color="stateColor(user.estado.nombre)"
                size="small"
                variant="tonal"
                >{{ user.estado.nombre }}</v-chip
              >
            </div>
            <div class="text-body-2 text-medium-emphasis mb-2">
              <v-icon size="17" class="me-1">mdi-shield-account-outline</v-icon
              >{{ user.rol.nombre }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              <v-icon size="17" class="me-1">mdi-store-outline</v-icon
              >{{ branchNames(user) }}
            </div> </v-card-text
          ><v-divider /><v-card-actions class="justify-end"
            ><v-btn
              v-if="canEdit(user)"
              color="primary"
              variant="text"
              prepend-icon="mdi-pencil-outline"
              @click="openEdit(user)"
              >Editar</v-btn
            ><v-btn
              v-if="canAssign(user)"
              color="primary"
              variant="text"
              prepend-icon="mdi-store-plus-outline"
              @click="openBranches(user)"
              >Sucursales</v-btn
            ></v-card-actions
          >
        </v-card>
      </div>
      <v-card
        v-if="filtered.length"
        class="admin-desktop-list rounded-xl shadow-sm overflow-hidden"
        elevation="0"
        border
        ><v-table hover
          ><thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Documento</th>
              <th>Rol</th>
              <th>Sucursales</th>
              <th>Estado</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filtered" :key="user.idUsuario">
              <td>#{{ user.idUsuario }}</td>
              <td>
                <div class="d-flex align-center ga-2">
                  <v-avatar size="32" color="primary" variant="tonal">{{
                    initials(user)
                  }}</v-avatar
                  ><strong>{{ fullName(user) }}</strong>
                </div>
              </td>
              <td>{{ user.correo }}</td>
              <td>{{ user.perfil?.numeroDocumento || "—" }}</td>
              <td>
                <v-chip color="primary" variant="tonal" size="small">{{
                  user.rol.nombre
                }}</v-chip>
              </td>
              <td>{{ branchNames(user) }}</td>
              <td>
                <v-chip
                  :color="stateColor(user.estado.nombre)"
                  size="small"
                  variant="tonal"
                  >{{ user.estado.nombre }}</v-chip
                >
              </td>
              <td class="text-center">
                <v-btn
                  v-if="canEdit(user)"
                  icon="mdi-pencil-outline"
                  size="small"
                  variant="text"
                  color="primary"
                  aria-label="Editar usuario"
                  @click="openEdit(user)"
                /><v-btn
                  v-if="canAssign(user)"
                  icon="mdi-store-plus-outline"
                  size="small"
                  variant="text"
                  color="primary"
                  aria-label="Asignar sucursales"
                  @click="openBranches(user)"
                />
              </td>
            </tr></tbody></v-table
      ></v-card>
      <v-card
        v-if="!filtered.length"
        class="rounded-xl text-center pa-10"
        elevation="0"
        border
        ><v-icon size="52" color="medium-emphasis"
          >mdi-account-off-outline</v-icon
        >
        <div class="mt-2 text-medium-emphasis">
          No se encontraron usuarios
        </div></v-card
      >
    </template>
    <v-dialog v-model="formDialog" max-width="760" persistent scrollable
      ><v-card rounded="xl"
        ><v-card-title class="pa-5 bg-primary text-white"
          ><v-icon class="me-2">mdi-account-edit-outline</v-icon
          >{{ editing ? "Editar Usuario" : "Nuevo Usuario" }}</v-card-title
        ><v-card-text class="pa-5">
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            >{{ formError }}</v-alert
          ><v-row>
            <v-col cols="12" sm="6"
              ><v-text-field
                v-model="form.nombres"
                label="Nombres *"
                variant="outlined"
                density="comfortable" /></v-col
            ><v-col cols="12" sm="6"
              ><v-text-field
                v-model="form.apellidos"
                label="Apellidos *"
                variant="outlined"
                density="comfortable"
            /></v-col>
            <v-col cols="12" sm="6"
              ><v-text-field
                v-model="form.correo"
                label="Correo electrónico *"
                type="email"
                variant="outlined"
                density="comfortable" /></v-col
            ><v-col v-if="!editing" cols="12" sm="6"
              ><v-text-field
                v-model="form.contrasena"
                label="Contraseña *"
                type="password"
                hint="Mínimo 8 caracteres, una mayúscula y un número"
                persistent-hint
                variant="outlined"
                density="comfortable"
            /></v-col>
            <v-col v-if="!editing || auth.esSuperadmin" cols="12" sm="6"
              ><v-select
                v-model="form.idRol"
                :items="activeRoles"
                item-title="nombre"
                item-value="idRol"
                label="Rol *"
                variant="outlined"
                density="comfortable"
            /></v-col>
            <v-col cols="12" sm="6"
              ><v-select
                v-model="form.idTipoDocumento"
                :items="documentTypes"
                item-title="nombre"
                item-value="idTipoDocumento"
                label="Tipo de documento"
                clearable
                variant="outlined"
                density="comfortable"
            /></v-col>
            <v-col cols="12" sm="6"
              ><v-text-field
                v-model="form.numeroDocumento"
                label="Número de documento"
                variant="outlined"
                density="comfortable"
                @blur="lookupDocument()"
                ><template #append-inner
                  ><v-btn
                    v-if="documentKind === 'DNI'"
                    icon="mdi-magnify"
                    size="small"
                    variant="text"
                    color="primary"
                    :loading="lookupLoading"
                    aria-label="Consultar DNI"
                    @click="lookupDocument(true)" /></template></v-text-field
            ></v-col>
            <v-col cols="12" sm="6"
              ><v-text-field
                v-model="form.telefono"
                label="Teléfono"
                variant="outlined"
                density="comfortable" /></v-col
            ><v-col cols="12"
              ><v-text-field
                v-model="form.direccion"
                label="Dirección"
                variant="outlined"
                density="comfortable"
            /></v-col>
            <v-col
              v-if="
                editing &&
                (auth.puede(Permiso.USUARIOS_ACTIVAR) ||
                  auth.puede(Permiso.USUARIOS_DESACTIVAR))
              "
              cols="12"
              ><v-switch
                v-model="form.activo"
                :label="form.activo ? 'Usuario activo' : 'Usuario inactivo'"
                color="primary"
                hide-details
            /></v-col> </v-row></v-card-text
        ><v-card-actions class="pa-4 justify-end"
          ><v-btn variant="text" @click="formDialog = false">Cancelar</v-btn
          ><v-btn color="primary" :loading="saving" @click="saveUser"
            >Guardar</v-btn
          ></v-card-actions
        ></v-card
      ></v-dialog
    >
    <v-dialog v-model="branchesDialog" max-width="520"
      ><v-card rounded="xl"
        ><v-card-title class="pa-5 bg-primary text-white"
          >Sucursales de
          {{ selectedUser ? fullName(selectedUser) : "" }}</v-card-title
        ><v-card-text class="pa-5"
          ><v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            class="mb-3"
            >{{ formError }}</v-alert
          ><v-select
            v-model="selectedBranches"
            :items="activeBranches"
            item-title="nombre"
            item-value="idSucursal"
            label="Sucursales asignadas"
            chips
            multiple
            variant="outlined" /></v-card-text
        ><v-card-actions class="pa-4 justify-end"
          ><v-btn variant="text" @click="branchesDialog = false">Cancelar</v-btn
          ><v-btn color="primary" :loading="saving" @click="saveBranches"
            >Guardar</v-btn
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
import { computed, onMounted, reactive, ref } from "vue";
import {
  usuariosApi,
  documentosApi,
  sucursalesApi,
} from "@/core/api/administracion.api";
import { getApiErrorMessage } from "@/core/api/api-error";
import { Permiso } from "@/core/constants/permisos";
import type {
  Sucursal,
  TipoDocumento,
  Usuario,
  UsuarioPayload,
} from "@/core/types/administracion.types";
import { useAuthStore } from "@/modules/auth/auth.store";

const auth = useAuthStore();
const users = ref<Usuario[]>([]),
  roles = ref<{ idRol: number; nombre: string }[]>([]),
  branches = ref<Sucursal[]>([]),
  documentTypes = ref<TipoDocumento[]>([]);
const loading = ref(true),
  saving = ref(false),
  lookupLoading = ref(false);
const search = ref(""),
  statusFilter = ref("Todos"),
  pageError = ref(""),
  formError = ref(""),
  notice = ref("");
const noticeVisible = ref(false),
  formDialog = ref(false),
  branchesDialog = ref(false);
const editing = ref<Usuario | null>(null),
  selectedUser = ref<Usuario | null>(null),
  selectedBranches = ref<number[]>([]);
let lastDniLookup = "";
const form = reactive({
  correo: "",
  contrasena: "",
  idRol: null as number | null,
  nombres: "",
  apellidos: "",
  idTipoDocumento: null as number | null,
  numeroDocumento: "",
  telefono: "",
  direccion: "",
  activo: true,
});
const filtered = computed(() =>
  users.value.filter((user) => {
    const query = search.value?.toLocaleLowerCase("es").trim() || "";
    return (
      (statusFilter.value === "Todos" ||
        user.estado.nombre === statusFilter.value) &&
      (!query ||
        `${fullName(user)} ${user.correo} ${user.perfil?.numeroDocumento || ""}`
          .toLocaleLowerCase("es")
          .includes(query))
    );
  }),
);
const activeRoles = computed(() => roles.value),
  activeBranches = computed(() =>
    branches.value.filter((branch) => branch.activo),
  );
const documentKind = computed(
  () =>
    documentTypes.value.find(
      (item) => item.idTipoDocumento === form.idTipoDocumento,
    )?.nombre,
);
function fullName(user: Usuario) {
  return (
    [user.perfil?.nombres, user.perfil?.apellidos].filter(Boolean).join(" ") ||
    user.correo
  );
}
function initials(user: Usuario) {
  return fullName(user).slice(0, 2).toUpperCase();
}
function branchNames(user: Usuario) {
  return (
    user.sucursales.map((item) => item.sucursal.nombre).join(", ") ||
    "Sin sucursal"
  );
}
function stateColor(state: string) {
  return state === "ACTIVO"
    ? "success"
    : state === "BLOQUEADO"
      ? "warning"
      : "error";
}
function canEdit(user: Usuario) {
  return (
    user.idUsuario !== auth.usuario?.idUsuario &&
    user.rol.nombre !== "SUPERADMIN" &&
    (auth.puede(Permiso.USUARIOS_EDITAR) ||
      auth.esSuperadmin ||
      auth.puede(Permiso.USUARIOS_ACTIVAR) ||
      auth.puede(Permiso.USUARIOS_DESACTIVAR))
  );
}
function canAssign(user: Usuario) {
  return (
    user.idUsuario !== auth.usuario?.idUsuario &&
    auth.puede(Permiso.USUARIOS_ASIGNAR_SUCURSALES) &&
    auth.puede(Permiso.SUCURSALES_VER)
  );
}
async function load() {
  loading.value = true;
  pageError.value = "";
  try {
    const [u, r, b, d] = await Promise.all([
      usuariosApi.listar(),
      auth.puede(Permiso.USUARIOS_CREAR)
        ? usuariosApi.rolesDisponibles()
        : Promise.resolve(null),
      auth.puede(Permiso.SUCURSALES_VER)
        ? sucursalesApi.listar()
        : Promise.resolve(null),
      documentosApi.tipos(),
    ]);
    users.value = u.data;
    roles.value = r?.data ?? [];
    branches.value = b?.data ?? [];
    documentTypes.value = d.data;
  } catch (error) {
    pageError.value = getApiErrorMessage(
      error,
      "No se pudieron cargar los usuarios",
    );
  } finally {
    loading.value = false;
  }
}
function resetForm() {
  Object.assign(form, {
    correo: "",
    contrasena: "",
    idRol: null,
    nombres: "",
    apellidos: "",
    idTipoDocumento: null,
    numeroDocumento: "",
    telefono: "",
    direccion: "",
    activo: true,
  });
  formError.value = "";
  lastDniLookup = "";
}
function openCreate() {
  editing.value = null;
  resetForm();
  formDialog.value = true;
}
async function openEdit(user: Usuario) {
  formError.value = "";
  try {
    const { data } = await usuariosApi.obtener(user.idUsuario);
    editing.value = data;
    Object.assign(form, {
      correo: data.correo,
      contrasena: "",
      idRol: data.rol.idRol,
      nombres: data.perfil?.nombres ?? "",
      apellidos: data.perfil?.apellidos ?? "",
      idTipoDocumento: data.perfil?.idTipoDocumento ?? null,
      numeroDocumento: data.perfil?.numeroDocumento ?? "",
      telefono: data.perfil?.telefono ?? "",
      direccion: data.perfil?.direccion ?? "",
      activo: data.estado.nombre === "ACTIVO",
    });
    lastDniLookup = data.perfil?.numeroDocumento ?? "";
    formDialog.value = true;
  } catch (error) {
    pageError.value = getApiErrorMessage(error);
  }
}
function optional(value: string) {
  return value.trim() || undefined;
}
async function saveUser() {
  formError.value = "";
  if (
    (!editing.value || auth.puede(Permiso.USUARIOS_EDITAR)) &&
    (!form.nombres.trim() || !form.apellidos.trim() || !form.correo.trim())
  ) {
    formError.value = "Completa nombres, apellidos y correo";
    return;
  }
  if (form.numeroDocumento && !form.idTipoDocumento) {
    formError.value = "Selecciona el tipo de documento";
    return;
  }
  if (!editing.value && (!form.idRol || !form.contrasena)) {
    formError.value = "Selecciona un rol y escribe una contraseña";
    return;
  }
  saving.value = true;
  try {
    const perfil = {
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      idTipoDocumento: form.idTipoDocumento ?? undefined,
      numeroDocumento: optional(form.numeroDocumento),
      telefono: optional(form.telefono),
      direccion: optional(form.direccion),
    };
    if (editing.value) {
      const current = editing.value;
      const payload: Record<string, unknown> = {};
      if (auth.puede(Permiso.USUARIOS_EDITAR)) {
        payload.correo = form.correo.trim();
        payload.perfil = {
          ...perfil,
          idTipoDocumento: form.idTipoDocumento,
          numeroDocumento: form.numeroDocumento.trim() || null,
          telefono: form.telefono.trim() || null,
          direccion: form.direccion.trim() || null,
        };
      }
      if (auth.esSuperadmin && form.idRol !== current.rol.idRol)
        payload.idRol = form.idRol;
      if (form.activo !== (current.estado.nombre === "ACTIVO"))
        payload.estado = form.activo ? "ACTIVO" : "INACTIVO";
      if (!Object.keys(payload).length) {
        formError.value = "No hay cambios para guardar";
        return;
      }
      await usuariosApi.actualizar(current.idUsuario, payload);
      notice.value = "Usuario actualizado";
    } else {
      await usuariosApi.crear({
        correo: form.correo.trim(),
        contrasena: form.contrasena,
        idRol: form.idRol!,
        perfil,
      } as UsuarioPayload);
      notice.value = "Usuario creado";
    }
    formDialog.value = false;
    noticeVisible.value = true;
    await load();
  } catch (error) {
    formError.value = getApiErrorMessage(error);
  } finally {
    saving.value = false;
  }
}
async function lookupDocument(force = false) {
  if (documentKind.value !== "DNI") return;
  const numero = form.numeroDocumento.trim();
  if (!/^\d{8}$/.test(numero)) {
    if (!force) return;
    formError.value = "Ingresa un DNI de 8 dígitos";
    return;
  }
  if (lookupLoading.value || (!force && lastDniLookup === numero)) return;
  lookupLoading.value = true;
  formError.value = "";
  try {
    const { data } = await documentosApi.consultar("DNI", numero);
    if (data.tipoDocumento === "DNI" && form.numeroDocumento.trim() === numero) {
      form.nombres = data.nombres;
      form.apellidos = data.apellidos;
      lastDniLookup = numero;
    }
  } catch (error) {
    formError.value = getApiErrorMessage(error, "No se pudo consultar el DNI");
  } finally {
    lookupLoading.value = false;
  }
}
function openBranches(user: Usuario) {
  selectedUser.value = user;
  selectedBranches.value = user.sucursales.map(
    (item) => item.sucursal.idSucursal,
  );
  formError.value = "";
  branchesDialog.value = true;
}
async function saveBranches() {
  if (!selectedUser.value) return;
  saving.value = true;
  formError.value = "";
  try {
    await usuariosApi.asignarSucursales(
      selectedUser.value.idUsuario,
      selectedBranches.value,
    );
    branchesDialog.value = false;
    notice.value = "Sucursales asignadas";
    noticeVisible.value = true;
    await load();
  } catch (error) {
    formError.value = getApiErrorMessage(error);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>

<style scoped>
.admin-page {
  max-width: 1600px;
  margin: 0 auto;
}
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.filter-search {
  flex: 1 1 260px;
  max-width: 500px;
}
.filter-select {
  flex: 0 1 170px;
}
.admin-mobile-list {
  display: none;
}
@media (max-width: 800px) {
  .admin-desktop-list {
    display: none;
  }
  .admin-mobile-list {
    display: block;
  }
  .filter-select {
    flex: 1 1 140px;
  }
}
</style>
