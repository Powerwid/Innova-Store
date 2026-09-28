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
          v-if="auth.puede(Permiso.USUARIOS_GESTIONAR)"
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
    <v-dialog v-model="formDialog" max-width="720" persistent>
      <v-card class="user-form-card rounded-xl" elevation="24">
        <v-card-item class="user-form-header pa-3 pa-sm-5">
          <template #prepend>
            <v-avatar color="rgba(255,255,255,0.2)" size="48" class="me-3">
              <v-icon color="white" size="25">{{ editing ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-white font-weight-bold text-h6">
            {{ editing ? "Editar usuario" : "Nuevo usuario" }}
          </v-card-title>
          <v-card-subtitle class="text-white opacity-90 d-none d-sm-block">
            Completa los datos de acceso y del perfil
          </v-card-subtitle>
          <template #append>
            <v-btn icon="mdi-close" color="white" variant="text" :disabled="saving" @click="formDialog = false" />
          </template>
        </v-card-item>

        <v-card-text class="user-form-body pa-4 pa-sm-6">
          <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mb-4">
            {{ formError }}
          </v-alert>

          <section>
            <div class="user-form-section-title">
              <v-icon size="20" color="primary">mdi-card-account-details-outline</v-icon>
              Documento
            </div>
            <div class="user-form-grid user-document-grid">
              <v-select
                v-model="form.idTipoDocumento"
                :items="documentTypes"
                item-title="nombre"
                item-value="idTipoDocumento"
                label="Tipo de documento"
                placeholder="Selecciona el tipo"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :error-messages="fieldErrors.idTipoDocumento"
                @update:model-value="changeUserDocumentType"
              />
              <v-text-field
                v-model="form.numeroDocumento"
                label="Número de documento"
                :placeholder="documentPlaceholder"
                :maxlength="documentMaxLength"
                :inputmode="documentKind === 'CE' ? 'text' : 'numeric'"
                :disabled="!form.idTipoDocumento"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :error-messages="fieldErrors.numeroDocumento"
                @update:model-value="sanitizeUserDocument"
                @blur="lookupDocument()"
                @keyup.enter="lookupDocument(true)"
              >
                <template #append-inner>
                  <v-btn
                    v-if="documentKind === 'DNI'"
                    icon="mdi-magnify"
                    size="small"
                    variant="text"
                    color="primary"
                    :loading="lookupLoading"
                    :disabled="!/^\d{8}$/.test(form.numeroDocumento)"
                    aria-label="Consultar DNI"
                    @click="lookupDocument(true)"
                  />
                </template>
              </v-text-field>
            </div>
          </section>

          <section class="user-form-section">
            <div class="user-form-section-title">
              <v-icon size="20" color="primary">mdi-account-outline</v-icon>
              Datos personales
            </div>
            <div class="user-form-grid">
              <v-text-field
                v-model="form.nombres"
                label="Nombres *"
                placeholder="Ingresa los nombres"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :error-messages="fieldErrors.nombres"
                @update:model-value="clearFieldError('nombres')"
              />
              <v-text-field
                v-model="form.apellidos"
                label="Apellidos *"
                placeholder="Ingresa los apellidos"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :error-messages="fieldErrors.apellidos"
                @update:model-value="clearFieldError('apellidos')"
              />
            </div>
          </section>

          <section class="user-form-section">
            <div class="user-form-section-title">
              <v-icon size="20" color="primary">mdi-shield-account-outline</v-icon>
              Acceso al sistema
            </div>
            <div class="user-form-grid">
              <v-text-field
                v-model="form.correo"
                label="Correo electrónico *"
                placeholder="usuario@empresa.com"
                type="email"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :error-messages="fieldErrors.correo"
                @update:model-value="clearFieldError('correo')"
              />
              <v-text-field
                v-if="!editing"
                v-model="form.contrasena"
                label="Contraseña *"
                placeholder="Mínimo 8 caracteres"
                type="password"
                hint="Debe incluir una mayúscula y un número"
                persistent-hint
                :error-messages="fieldErrors.contrasena"
                @update:model-value="clearFieldError('contrasena')"
                variant="outlined"
                density="compact"
              />
              <v-select
                v-if="!editing || auth.esSuperadmin"
                v-model="form.idRol"
                :items="activeRoles"
                item-title="nombre"
                item-value="idRol"
                label="Rol *"
                placeholder="Selecciona un rol"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :error-messages="fieldErrors.idRol"
                @update:model-value="clearFieldError('idRol')"
              />
            </div>
          </section>

          <section class="user-form-section">
            <div class="user-form-section-title">
              <v-icon size="20" color="primary">mdi-phone-outline</v-icon>
              Datos opcionales
            </div>
            <v-text-field
              v-model="form.telefono"
              label="Teléfono"
              placeholder="Ingresa un teléfono"
              variant="outlined"
              density="compact"
              hide-details="auto"
            />
            <v-text-field
              v-model="form.direccion"
              label="Dirección"
              placeholder="Ingresa una dirección"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mt-2"
            />
          </section>

          <section v-if="editing && auth.puede(Permiso.USUARIOS_GESTIONAR)" class="user-form-section user-form-status">
            <div>
              <div class="font-weight-bold">Estado</div>
              <div class="text-caption text-medium-emphasis">Controla si el usuario puede ingresar al sistema.</div>
            </div>
            <v-switch v-model="form.activo" color="primary" inset hide-details />
          </section>
        </v-card-text>

        <v-card-actions class="pa-4 border-t">
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="formDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" min-width="130" :loading="saving" @click="saveUser">
            {{ editing ? 'Actualizar' : 'Guardar' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
type UserField = "nombres" | "apellidos" | "correo" | "contrasena" | "idRol" | "idTipoDocumento" | "numeroDocumento";
const fieldErrors = reactive<Record<UserField, string>>({
  nombres: "", apellidos: "", correo: "", contrasena: "", idRol: "", idTipoDocumento: "", numeroDocumento: "",
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
const documentMaxLength = computed(() =>
  documentKind.value === "DNI" ? 8 : documentKind.value === "RUC" ? 11 : 20,
);
const documentPlaceholder = computed(() =>
  documentKind.value === "DNI"
    ? "Ingresa 8 dígitos"
    : documentKind.value === "RUC"
      ? "Ingresa 11 dígitos"
      : documentKind.value === "CE"
        ? "Ingresa el carné de extranjería"
        : "Selecciona primero el tipo",
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
    (auth.puede(Permiso.USUARIOS_GESTIONAR) || auth.esSuperadmin)
  );
}
function canAssign(user: Usuario) {
  return (
    user.idUsuario !== auth.usuario?.idUsuario &&
    auth.puede(Permiso.USUARIOS_GESTIONAR) &&
    auth.puede(Permiso.SUCURSALES_VER)
  );
}
async function load() {
  loading.value = true;
  pageError.value = "";
  try {
    const [u, r, b, d] = await Promise.all([
      usuariosApi.listar(),
      auth.puede(Permiso.USUARIOS_GESTIONAR)
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
  const dni = documentTypes.value.find((item) => item.nombre === "DNI");
  Object.assign(form, {
    correo: "",
    contrasena: "",
    idRol: null,
    nombres: "",
    apellidos: "",
    idTipoDocumento: dni?.idTipoDocumento ?? null,
    numeroDocumento: "",
    telefono: "",
    direccion: "",
    activo: true,
  });
  formError.value = "";
  clearFieldErrors();
  lastDniLookup = "";
}
function changeUserDocumentType() {
  form.numeroDocumento = "";
  clearFieldError("idTipoDocumento");
  clearFieldError("numeroDocumento");
  lastDniLookup = "";
}
function sanitizeUserDocument(value: string) {
  const raw = String(value || "").toUpperCase();
  form.numeroDocumento = documentKind.value === "CE"
    ? raw.replace(/[^A-Z0-9]/g, "").slice(0, documentMaxLength.value)
    : raw.replace(/\D/g, "").slice(0, documentMaxLength.value);
  clearFieldError("numeroDocumento");
}
function clearFieldError(field: UserField) {
  fieldErrors[field] = "";
  if (!Object.values(fieldErrors).some(Boolean) && formError.value.startsWith("Revisa los campos")) formError.value = "";
}
function clearFieldErrors() {
  for (const field of Object.keys(fieldErrors) as UserField[]) fieldErrors[field] = "";
}
function validateUserForm() {
  clearFieldErrors();
  if (!editing.value || auth.puede(Permiso.USUARIOS_GESTIONAR)) {
    if (form.nombres.trim().length < 2) fieldErrors.nombres = "Ingresa los nombres (mínimo 2 caracteres)";
    if (form.apellidos.trim().length < 2) fieldErrors.apellidos = "Ingresa los apellidos (mínimo 2 caracteres)";
    if (!form.correo.trim()) fieldErrors.correo = "Ingresa el correo electrónico";
    else if (!/^\S+@\S+\.\S+$/.test(form.correo.trim())) fieldErrors.correo = "Ingresa un correo electrónico válido";
  }
  if (form.numeroDocumento.trim()) {
    if (!form.idTipoDocumento) fieldErrors.idTipoDocumento = "Selecciona el tipo de documento";
    else if (documentKind.value === "DNI" && !/^\d{8}$/.test(form.numeroDocumento)) fieldErrors.numeroDocumento = "El DNI debe tener exactamente 8 dígitos";
    else if (documentKind.value === "RUC" && !/^\d{11}$/.test(form.numeroDocumento)) fieldErrors.numeroDocumento = "El RUC debe tener exactamente 11 dígitos";
    else if (documentKind.value === "CE" && !/^[A-Z0-9]{6,20}$/.test(form.numeroDocumento)) fieldErrors.numeroDocumento = "Ingresa un carné de extranjería válido";
  }
  if (!editing.value) {
    if (!form.idRol) fieldErrors.idRol = "Selecciona el rol del usuario";
    if (!form.contrasena) fieldErrors.contrasena = "Ingresa una contraseña";
    else if (form.contrasena.length < 8) fieldErrors.contrasena = "La contraseña debe tener al menos 8 caracteres";
    else if (!/[A-Z]/.test(form.contrasena)) fieldErrors.contrasena = "Incluye al menos una letra mayúscula";
    else if (!/\d/.test(form.contrasena)) fieldErrors.contrasena = "Incluye al menos un número";
  } else if (auth.esSuperadmin && !form.idRol) fieldErrors.idRol = "Selecciona el rol del usuario";
  return !Object.values(fieldErrors).some(Boolean);
}
function openCreate() {
  editing.value = null;
  resetForm();
  formDialog.value = true;
}
async function openEdit(user: Usuario) {
  formError.value = "";
  clearFieldErrors();
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
  if (!validateUserForm()) {
    formError.value = "Revisa los campos resaltados; cada uno indica qué dato falta o debe corregirse";
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
      if (auth.puede(Permiso.USUARIOS_GESTIONAR)) {
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
    fieldErrors.numeroDocumento = "El DNI debe tener exactamente 8 dígitos";
    return;
  }
  if (lookupLoading.value || (!force && lastDniLookup === numero)) return;
  lookupLoading.value = true;
  formError.value = "";
  try {
    const { data } = await documentosApi.consultar("DNI", numero);
    if (data.tipoDocumento === "DNI" && form.numeroDocumento.trim() === numero) {
      clearFieldError("numeroDocumento");
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
.user-form-card {
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.user-form-header {
  flex: 0 0 auto;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-primary-darken-1)));
}
.user-form-body {
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}
.user-form-section {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.user-form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 1rem;
  font-weight: 700;
}
.user-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.user-document-grid {
  grid-template-columns: 0.85fr 1.15fr;
}
.user-form-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
  .user-form-grid,
  .user-document-grid {
    grid-template-columns: 1fr;
  }
}
</style>
