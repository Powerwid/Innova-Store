<template>
  <div class="branches-page">
    <v-card class="mb-6 rounded-xl shadow-sm" elevation="0" border
      ><v-card-text class="filter-bar pa-4">
        <v-text-field
          v-model="search"
          placeholder="Buscar sucursal..."
          density="comfortable"
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          hide-details
          rounded="lg"
          clearable
          class="filter-search"
        />
        <v-select
          v-model="statusFilter"
          :items="['Todas', 'Activas', 'Inactivas']"
          label="Estado"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          hide-details
          class="filter-status"
        />
        <v-btn
          v-if="auth.puede(Permiso.SUCURSALES_GESTIONAR)"
          color="primary"
          prepend-icon="mdi-plus"
          rounded="lg"
          @click="openCreate"
          >Nueva Sucursal</v-btn
        >
        <span class="filter-count text-body-2 text-medium-emphasis"
          ><v-icon size="19" class="me-1">mdi-store</v-icon
          >{{ filtered.length }} sucursales</span
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
    <template v-else>
      <div class="branch-mobile-list">
        <v-card
          v-for="branch in filtered"
          :key="branch.idSucursal"
          class="rounded-xl mb-3"
          elevation="0"
          border
          ><v-card-text class="pa-4"
            ><div class="d-flex align-center ga-3 mb-3">
              <v-avatar color="primary" variant="tonal"
                ><v-icon>mdi-store</v-icon></v-avatar
              >
              <div class="flex-grow-1">
                <strong>{{ branch.nombre }}</strong>
                <div class="text-caption text-medium-emphasis">
                  #{{ branch.idSucursal }}
                </div>
              </div>
              <v-chip
                :color="branch.activo ? 'success' : 'error'"
                size="small"
                variant="tonal"
                >{{ branch.activo ? "Activa" : "Inactiva" }}</v-chip
              >
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{
                branch.perfil?.razonSocial ||
                branch.perfil?.nombreComercial ||
                "Sin datos comerciales"
              }}
            </div>
            <div class="text-caption text-medium-emphasis mt-2">
              {{ branch._count.usuarios }} usuarios ·
              {{ branch.perfil?.numeroDocumento || "Sin documento" }}
            </div></v-card-text
          ><v-divider /><v-card-actions
            v-if="auth.puede(Permiso.SUCURSALES_GESTIONAR)"
            class="justify-end"
            ><v-btn
              color="primary"
              variant="text"
              prepend-icon="mdi-pencil-outline"
              @click="openEdit(branch)"
              >Editar</v-btn
            ></v-card-actions
          ></v-card
        >
      </div>
      <v-card
        v-if="filtered.length"
        class="branch-desktop-list rounded-xl shadow-sm overflow-hidden"
        elevation="0"
        border
        ><v-table hover
          ><thead>
            <tr>
              <th>ID</th>
              <th>Sucursal</th>
              <th>Razón social</th>
              <th>Documento</th>
              <th>Dirección</th>
              <th>Usuarios</th>
              <th>Estado</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="branch in filtered" :key="branch.idSucursal">
              <td>#{{ branch.idSucursal }}</td>
              <td>
                <div class="d-flex align-center ga-2">
                  <v-avatar color="primary" variant="tonal" size="32"
                    ><v-icon size="18">mdi-store</v-icon></v-avatar
                  ><strong>{{ branch.nombre }}</strong>
                </div>
              </td>
              <td>{{ branch.perfil?.razonSocial || "—" }}</td>
              <td>{{ branch.perfil?.numeroDocumento || "—" }}</td>
              <td>{{ branch.perfil?.direccionComercial || "—" }}</td>
              <td>{{ branch._count.usuarios }}</td>
              <td>
                <v-chip
                  :color="branch.activo ? 'success' : 'error'"
                  size="small"
                  variant="tonal"
                  >{{ branch.activo ? "Activa" : "Inactiva" }}</v-chip
                >
              </td>
              <td class="text-center">
                <v-btn
                  v-if="auth.puede(Permiso.SUCURSALES_GESTIONAR)"
                  icon="mdi-pencil-outline"
                  size="small"
                  variant="text"
                  color="primary"
                  aria-label="Editar sucursal"
                  @click="openEdit(branch)"
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
          >mdi-store-off-outline</v-icon
        >
        <div class="mt-2 text-medium-emphasis">
          No se encontraron sucursales
        </div></v-card
      >
    </template>
    <v-dialog v-model="dialog" max-width="850" persistent scrollable
      ><v-card rounded="xl"
        ><v-card-title class="pa-5 bg-primary text-white"
          ><v-icon class="me-2">mdi-store-edit-outline</v-icon
          >{{ editing ? "Editar Sucursal" : "Nueva Sucursal" }}</v-card-title
        ><v-card-text class="pa-5"
          ><v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            >{{ formError }}</v-alert
          >
            <div class="branch-section-title"><v-icon size="18">mdi-information-outline</v-icon>Datos generales</div>
            <v-row>
              <v-col cols="12" sm="4"><label class="branch-field-label" for="branch-ruc">RUC *</label><v-text-field
                id="branch-ruc"
                v-model="form.numeroDocumento"
                placeholder="12345678901"
                variant="outlined"
                density="comfortable"
                maxlength="11"
                :error-messages="fieldErrors.numeroDocumento"
                @update:model-value="clearFieldError('numeroDocumento')"
                @blur="lookupRuc()"
                @keyup.enter.prevent="lookupRuc(true)"
              ><template #append-inner><v-btn
                icon="mdi-magnify" variant="text" size="small" color="primary"
                :loading="lookupLoading" aria-label="Consultar RUC" @click="lookupRuc(true)"
              /></template></v-text-field></v-col>
              <v-col cols="12" sm="4"><label class="branch-field-label" for="branch-name">Nombre de la sucursal *</label><v-text-field
                id="branch-name" v-model="form.nombre" placeholder="Sucursal Principal"
                variant="outlined" density="comfortable"
                :error-messages="fieldErrors.nombre"
                @update:model-value="clearFieldError('nombre')"
              /></v-col>
              <v-col cols="12" sm="4"><label class="branch-field-label" for="branch-razon">Razón social *</label><v-text-field
                id="branch-razon" v-model="form.razonSocial" placeholder="Empresa S.A.C."
                variant="outlined" density="comfortable"
                :error-messages="fieldErrors.razonSocial"
                @update:model-value="clearFieldError('razonSocial')"
              /></v-col>
            </v-row>

            <div class="branch-section-title"><v-icon size="18">mdi-map-marker-outline</v-icon>Ubicación</div>
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <label class="branch-field-label" for="branch-departamento">
                  Departamento *
                </label>
                <v-text-field
                  id="branch-departamento"
                  v-model="form.departamento"
                  :error-messages="fieldErrors.departamento"
                  @update:model-value="clearFieldError('departamento')"
                  placeholder="Arequipa"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <label class="branch-field-label" for="branch-provincia">
                  Provincia *
                </label>
                <v-text-field
                  id="branch-provincia"
                  v-model="form.provincia"
                  :error-messages="fieldErrors.provincia"
                  @update:model-value="clearFieldError('provincia')"
                  placeholder="Arequipa"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <label class="branch-field-label" for="branch-distrito">
                  Distrito *
                </label>
                <v-text-field
                  id="branch-distrito"
                  v-model="form.distrito"
                  :error-messages="fieldErrors.distrito"
                  @update:model-value="clearFieldError('distrito')"
                  placeholder="Cerro Colorado"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <label class="branch-field-label" for="branch-ubigeo">
                  Ubigeo
                </label>
                <v-text-field
                  id="branch-ubigeo"
                  v-model="form.ubigeo"
                  :error-messages="fieldErrors.ubigeo"
                  placeholder="040101"
                  inputmode="numeric"
                  maxlength="6"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="sanitizeUbigeo"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <label class="branch-field-label" for="branch-comercial">
                  Dirección comercial *
                </label>
                <v-text-field
                  id="branch-comercial"
                  v-model="form.direccionComercial"
                  :error-messages="fieldErrors.direccionComercial"
                  @update:model-value="clearFieldError('direccionComercial')"
                  placeholder="Av. Principal 123"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <label class="branch-field-label" for="branch-fiscal">
                  Dirección fiscal *
                </label>
                <v-text-field
                  id="branch-fiscal"
                  v-model="form.direccionFiscal"
                  :error-messages="fieldErrors.direccionFiscal"
                  @update:model-value="clearFieldError('direccionFiscal')"
                  placeholder="Av. Principal 123"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <label class="branch-field-label" for="branch-web">
                  Dirección web
                </label>
                <v-text-field
                  id="branch-web"
                  v-model="form.direccionWeb"
                  :error-messages="fieldErrors.direccionWeb"
                  @update:model-value="clearFieldError('direccionWeb')"
                  placeholder="https://ejemplo.com"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <label class="branch-field-label" for="branch-igv">
                  IGV (%) *
                </label>
                <v-text-field
                  id="branch-igv"
                  v-model="form.igv"
                  :error-messages="fieldErrors.igv"
                  @update:model-value="clearFieldError('igv')"
                  placeholder="18"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>

            <div class="branch-section-title"><v-icon size="18">mdi-phone-outline</v-icon>Contacto</div>
            <v-row>
              <v-col cols="12" sm="6">
                <label class="branch-field-label" for="branch-telefono">
                  Teléfono *
                </label>
                <v-text-field 
                  id="branch-telefono" 
                  v-model="form.telefono" 
                  :error-messages="fieldErrors.telefono"
                  @update:model-value="clearFieldError('telefono')"
                  variant="outlined" 
                  density="comfortable"
                  placeholder="(01) 123-4567" 
                />
              </v-col>
              <v-col cols="12" sm="6">
                <label class="branch-field-label" for="branch-correo">
                  Correo electrónico *
                </label>
                <v-text-field 
                  id="branch-correo" 
                  v-model="form.correo" 
                  :error-messages="fieldErrors.correo"
                  @update:model-value="clearFieldError('correo')"
                  type="email" 
                  variant="outlined" 
                  density="comfortable" 
                  placeholder="sucursal@corre.com"
                />
              </v-col>
            <v-col
              v-if="editing && auth.puede(Permiso.SUCURSALES_GESTIONAR)"
              cols="12"
              ><v-switch
                v-model="form.activo"
                :label="form.activo ? 'Sucursal activa' : 'Sucursal inactiva'"
                color="primary"
                hide-details
            /></v-col> </v-row></v-card-text
        ><v-card-actions class="pa-4 justify-end"
          ><v-btn variant="text" @click="dialog = false">Cancelar</v-btn
          ><v-btn color="primary" :loading="saving" @click="save"
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
import { documentosApi, sucursalesApi } from "@/core/api/administracion.api";
import { getApiErrorMessage } from "@/core/api/api-error";
import { Permiso } from "@/core/constants/permisos";
import type {
  Sucursal,
  TipoDocumento,
} from "@/core/types/administracion.types";
import { useAuthStore } from "@/modules/auth/auth.store";
import { useSucursalStore } from "@/shared/stores/sucursal.store";

const auth = useAuthStore(),
  branchStore = useSucursalStore();
const branches = ref<Sucursal[]>([]),
  documentTypes = ref<TipoDocumento[]>([]);
const loading = ref(true),
  saving = ref(false),
  lookupLoading = ref(false),
  dialog = ref(false),
  noticeVisible = ref(false);
const editing = ref<Sucursal | null>(null),
  search = ref(""),
  statusFilter = ref("Todas"),
  error = ref(""),
  formError = ref(""),
  notice = ref("");
let lastRucLookup = "";
const form = reactive({
  nombre: "",
  idTipoDocumento: null as number | null,
  numeroDocumento: "",
  razonSocial: "",
  departamento: "Arequipa",
  provincia: "Arequipa",
  distrito: "Arequipa",
  direccionComercial: "",
  direccionFiscal: "",
  direccionWeb: "",
  ubigeo: "040101",
  igv: "18.00",
  telefono: "",
  correo: "",
  activo: true,
});
type BranchField = "numeroDocumento" | "nombre" | "razonSocial" | "departamento" | "provincia" | "distrito" | "direccionComercial" | "direccionFiscal" | "direccionWeb" | "ubigeo" | "igv" | "telefono" | "correo";
const fieldErrors = reactive<Record<BranchField, string>>({
  numeroDocumento: "", nombre: "", razonSocial: "", departamento: "", provincia: "", distrito: "",
  direccionComercial: "", direccionFiscal: "", direccionWeb: "", ubigeo: "", igv: "", telefono: "", correo: "",
});
const filtered = computed(() =>
  branches.value.filter((branch) => {
    const q = (search.value || "").trim().toLocaleLowerCase("es");
    return (
      (statusFilter.value === "Todas" ||
        branch.activo === (statusFilter.value === "Activas")) &&
      (!q ||
        `${branch.nombre} ${branch.perfil?.razonSocial || ""} ${branch.perfil?.numeroDocumento || ""}`
          .toLocaleLowerCase("es")
          .includes(q))
    );
  }),
);
const rucTypeId = computed(() => documentTypes.value.find((type) => type.nombre === "RUC")?.idTipoDocumento ?? null);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [b, d] = await Promise.all([
      sucursalesApi.listar(),
      documentosApi.tipos(),
    ]);
    branches.value = b.data;
    documentTypes.value = d.data;
    const sucursalesActivas = b.data
      .filter((item) => item.activo)
      .map((item) => ({
        idSucursal: item.idSucursal,
        nombre: item.nombre,
      }));
    if (auth.esSuperadmin) branchStore.reemplazarDisponibles(sucursalesActivas);
    else branchStore.actualizarNombres(sucursalesActivas);
  } catch (e) {
    error.value = getApiErrorMessage(e, "No se pudieron cargar las sucursales");
  } finally {
    loading.value = false;
  }
}
function resetForm() {
  Object.assign(form, {
    nombre: "",
    idTipoDocumento: rucTypeId.value,
    numeroDocumento: "",
    razonSocial: "",
    departamento: "Arequipa",
    provincia: "Arequipa",
    distrito: "Arequipa",
    direccionComercial: "",
    direccionFiscal: "",
    direccionWeb: "",
    ubigeo: "040101",
    igv: "18.00",
    telefono: "",
    correo: "",
    activo: true,
  });
  formError.value = "";
  clearFieldErrors();
  lastRucLookup = "";
}
function openCreate() {
  editing.value = null;
  resetForm();
  dialog.value = true;
}
async function openEdit(branch: Sucursal) {
  formError.value = "";
  clearFieldErrors();
  try {
    const { data } = await sucursalesApi.obtener(branch.idSucursal);
    editing.value = data;
    Object.assign(form, {
      nombre: data.nombre,
      idTipoDocumento: data.perfil?.idTipoDocumento ?? rucTypeId.value,
      numeroDocumento: data.perfil?.numeroDocumento ?? "",
      razonSocial: data.perfil?.razonSocial ?? "",
      departamento: data.perfil?.departamento?.trim() || "Arequipa",
      provincia: data.perfil?.provincia?.trim() || "Arequipa",
      distrito: data.perfil?.distrito?.trim() || "Arequipa",
      direccionComercial: data.perfil?.direccionComercial ?? "",
      direccionFiscal: data.perfil?.direccionFiscal ?? "",
      direccionWeb: data.perfil?.direccionWeb ?? "",
      ubigeo: data.perfil?.ubigeo?.trim() || "040101",
      igv: String(data.perfil?.igv ?? "18.00"),
      telefono: data.perfil?.telefono?.trim() || "",
      correo: data.perfil?.correo ?? "",
      activo: data.activo,
    });
    lastRucLookup = data.perfil?.numeroDocumento ?? "";
    dialog.value = true;
  } catch (e) {
    error.value = getApiErrorMessage(e);
  }
}
function sanitizeUbigeo(value: string) {
  form.ubigeo = String(value || "").replace(/\D/g, "").slice(0, 6);
  clearFieldError("ubigeo");
}
function clearFieldError(field: BranchField) {
  fieldErrors[field] = "";
  if (!Object.values(fieldErrors).some(Boolean) && formError.value.startsWith("Revisa los campos")) formError.value = "";
}
function clearFieldErrors() {
  for (const field of Object.keys(fieldErrors) as BranchField[]) fieldErrors[field] = "";
}
function validateBranchForm() {
  clearFieldErrors();
  if (form.nombre.trim().length < 2) fieldErrors.nombre = "Ingresa el nombre de la sucursal (mínimo 2 caracteres)";
  if (!/^\d{11}$/.test(form.numeroDocumento)) fieldErrors.numeroDocumento = "Ingresa un RUC válido de 11 dígitos";
  if (!form.razonSocial.trim()) fieldErrors.razonSocial = "Ingresa la razón social";
  if (!form.departamento.trim()) fieldErrors.departamento = "Ingresa el departamento";
  if (!form.provincia.trim()) fieldErrors.provincia = "Ingresa la provincia";
  if (!form.distrito.trim()) fieldErrors.distrito = "Ingresa el distrito";
  if (!form.direccionComercial.trim()) fieldErrors.direccionComercial = "Ingresa la dirección comercial";
  if (!form.direccionFiscal.trim()) fieldErrors.direccionFiscal = "Ingresa la dirección fiscal";
  if (!form.telefono.trim() || form.telefono.trim() === "-") fieldErrors.telefono = "Ingresa un teléfono de contacto";
  if (!form.correo.trim()) fieldErrors.correo = "Ingresa el correo electrónico";
  else if (!/^\S+@\S+\.\S+$/.test(form.correo.trim())) fieldErrors.correo = "Ingresa un correo electrónico válido";
  if (form.direccionWeb.trim() && !/^https?:\/\/\S+$/i.test(form.direccionWeb.trim())) fieldErrors.direccionWeb = "La dirección web debe comenzar con http:// o https://";
  if (form.ubigeo.trim() && !/^\d{6}$/.test(form.ubigeo.trim())) fieldErrors.ubigeo = "El ubigeo debe tener exactamente 6 dígitos";
  const igv = Number(form.igv);
  if (!form.igv.trim()) fieldErrors.igv = "Ingresa el porcentaje de IGV";
  else if (!Number.isFinite(igv) || igv < 0 || igv > 100 || !/^\d+(?:\.\d{1,2})?$/.test(form.igv.trim())) fieldErrors.igv = "Usa un valor entre 0 y 100 con hasta dos decimales";
  return !Object.values(fieldErrors).some(Boolean);
}
function nullable(value: string) {
  return value.trim() || null;
}
async function save() {
  formError.value = "";
  if (!validateBranchForm() || !rucTypeId.value) {
    formError.value = "Revisa los campos resaltados; cada uno indica qué dato falta o debe corregirse";
    return;
  }
  form.ubigeo = form.ubigeo.trim() || "040101";
  const igv = Number(form.igv);
  saving.value = true;
  try {
    const perfil = {
      idTipoDocumento: rucTypeId.value,
      numeroDocumento: form.numeroDocumento.trim(),
      razonSocial: form.razonSocial.trim(),
      departamento: form.departamento.trim(),
      provincia: form.provincia.trim(),
      distrito: form.distrito.trim(),
      direccionComercial: form.direccionComercial.trim(),
      direccionFiscal: form.direccionFiscal.trim(),
      direccionWeb: nullable(form.direccionWeb),
      ubigeo: form.ubigeo.trim() || "040101",
      igv,
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
    };
    if (editing.value) {
      const payload: Record<string, unknown> = {};
      if (auth.puede(Permiso.SUCURSALES_GESTIONAR)) {
        payload.nombre = form.nombre.trim();
        payload.perfil = perfil;
      }
      if (form.activo !== editing.value.activo) payload.activo = form.activo;
      if (!Object.keys(payload).length) {
        formError.value = "No hay cambios para guardar";
        return;
      }
      await sucursalesApi.actualizar(editing.value.idSucursal, payload);
      notice.value = "Sucursal actualizada";
    } else {
      await sucursalesApi.crear({ nombre: form.nombre.trim(), perfil });
      notice.value = "Sucursal creada";
    }
    dialog.value = false;
    noticeVisible.value = true;
    await load();
  } catch (e) {
    formError.value = getApiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}
async function lookupRuc(force = false) {
  const numero = form.numeroDocumento.trim();
  if (!/^\d{11}$/.test(numero)) {
    if (!force) return;
    fieldErrors.numeroDocumento = "Ingresa un RUC válido de 11 dígitos";
    return;
  }
  if (lookupLoading.value || (!force && lastRucLookup === numero)) return;
  lookupLoading.value = true;
  formError.value = "";
  try {
    const { data } = await documentosApi.consultar("RUC", numero);
    if (data.tipoDocumento === "RUC" && form.numeroDocumento.trim() === numero) {
      clearFieldError("numeroDocumento");
      form.idTipoDocumento = data.idTipoDocumento;
      form.razonSocial = data.razonSocial;
      form.direccionFiscal = data.direccion ?? "";
      if (!form.direccionComercial.trim()) form.direccionComercial = data.direccion ?? "";
      form.ubigeo = data.ubigeo?.trim() || "040101";
      form.departamento = data.departamento?.trim() || "Arequipa";
      form.provincia = data.provincia?.trim() || "Arequipa";
      form.distrito = data.distrito?.trim() || "Arequipa";
      lastRucLookup = numero;
    }
  } catch (e) {
    formError.value = getApiErrorMessage(e, "No se pudo consultar el RUC");
  } finally {
    lookupLoading.value = false;
  }
}
onMounted(load);
</script>

<style scoped>
.branches-page {
  max-width: 1600px;
  margin: 0 auto;
}
.filter-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(180px, 14vw, 220px) max-content max-content;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.filter-search {
  min-width: 0;
  width: 100%;
}
.filter-status {
  min-width: 0;
  width: 100%;
}
.filter-bar :deep(.v-input) {
  width: 100%;
}
.filter-count {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.branch-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  margin: 8px 0 12px;
}
.branch-field-label {
  display: block;
  margin-bottom: 6px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
  font-weight: 500;
}
.branch-mobile-list {
  display: none;
}
@media (max-width: 800px) {
  .branch-mobile-list {
    display: block;
  }
  .branch-desktop-list {
    display: none;
  }
  .filter-bar {
    grid-template-columns: minmax(0, 1fr);
  }
  .filter-count {
    justify-self: start;
  }
}
@media (min-width: 801px) and (max-width: 1100px) {
  .filter-bar {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
  }
  .filter-count {
    justify-self: end;
  }
}
</style>
