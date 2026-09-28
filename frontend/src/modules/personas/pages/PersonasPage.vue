<template>
  <div class="personas-page">
    <v-card class="mb-6 rounded-xl shadow-sm" elevation="0" border>
      <v-card-text class="pa-4">
        <div class="personas-api-title">
          <v-icon size="20" color="primary">mdi-card-account-details-outline</v-icon>
          <span>BÚSQUEDA RENIEC / SUNAT</span>
        </div>

        <div class="personas-api-bar">
          <v-text-field
            v-model="apiDocument"
            placeholder="DNI (8 dígitos) o RUC (11 dígitos)"
            inputmode="numeric"
            density="comfortable"
            variant="outlined"
            prepend-inner-icon="mdi-account-search-outline"
            hide-details
            rounded="lg"
            color="primary"
            maxlength="11"
            clearable
            @update:model-value="sanitizeApiDocument"
            @keyup.enter="consultDocument"
          >
            <template #append-inner>
              <v-btn
                v-if="canCreate"
                color="primary"
                variant="flat"
                rounded="lg"
                size="small"
                class="text-none font-weight-bold px-5"
                :loading="consulting"
                :disabled="!validApiDocument"
                @click="consultDocument"
              >
                <v-icon start size="17">mdi-magnify</v-icon>
                Consultar
              </v-btn>
            </template>
          </v-text-field>

          <v-btn
            v-if="canCreate"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-account-plus-outline"
            class="personas-api-add text-none font-weight-bold"
            rounded="lg"
            height="40"
            @click="openManualModal"
          >
            Registro Manual
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4 rounded-xl" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-card class="personas-list-card rounded-xl shadow-sm overflow-hidden" elevation="0" border>
      <div class="personas-list-toolbar pa-4">
        <v-btn-toggle
          v-model="role"
          color="primary"
          variant="flat"
          mandatory
          density="comfortable"
          rounded="lg"
          class="personas-role-toggle border"
          @update:model-value="changeRole"
        >
          <v-btn value="CLIENTE" class="text-none font-weight-bold">
            <v-icon start size="17">mdi-account-group-outline</v-icon>
            Clientes
          </v-btn>
          <v-btn value="PROVEEDOR" class="text-none font-weight-bold">
            <v-icon start size="17">mdi-truck-delivery-outline</v-icon>
            Proveedores
          </v-btn>
        </v-btn-toggle>

        <v-text-field
          v-model="search"
          placeholder="Buscar por nombre, DNI o RUC..."
          density="comfortable"
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          hide-details
          rounded="lg"
          color="primary"
          clearable
          @update:model-value="debounceSearch"
        />

        <v-btn
          icon="mdi-refresh"
          variant="tonal"
          color="primary"
          size="small"
          rounded="lg"
          :loading="loading"
          aria-label="Actualizar lista"
          @click="load"
        />

        <div class="personas-list-count text-body-2 text-medium-emphasis">
          <v-icon size="20" class="me-1">mdi-account-multiple</v-icon>
          {{ people.length }}
        </div>
      </div>

      <div class="personas-mobile-list">
        <div v-if="loading" class="d-flex justify-center py-12">
          <v-progress-circular indeterminate color="primary" size="40" width="4" />
        </div>

        <div v-else-if="!paginatedPeople.length" class="personas-empty">
          <v-icon size="56" color="medium-emphasis">mdi-account-off</v-icon>
          <div class="text-h6 mt-3">No hay registros</div>
          <div class="text-body-2 text-medium-emphasis">Busca un documento o regístralo manualmente.</div>
        </div>

        <div v-else class="pa-4">
          <v-card
            v-for="person in paginatedPeople"
            :key="`${person.tipo}-${person.id}`"
            class="rounded-xl mb-4"
            elevation="0"
            border
          >
            <v-card-text class="pa-4">
              <div class="d-flex align-start ga-3">
                <v-avatar size="42" color="primary" variant="tonal">
                  <v-icon size="20">{{ person.tipoDocumento.nombre === 'RUC' ? 'mdi-domain' : 'mdi-account' }}</v-icon>
                </v-avatar>
                <div class="flex-grow-1 min-width-0">
                  <div class="font-weight-bold text-truncate">{{ person.nombre }}</div>
                  <div class="text-caption text-medium-emphasis">{{ person.numeroDocumento }}</div>
                </div>
                <v-chip :color="person.activo ? 'success' : 'error'" size="x-small" variant="flat" class="text-white font-weight-bold">
                  {{ person.activo ? 'ACTIVO' : 'INACTIVO' }}
                </v-chip>
              </div>

              <v-chip
                class="mt-3 font-weight-bold"
                size="x-small"
                variant="tonal"
                :color="person.tipoDocumento.nombre === 'RUC' ? 'deep-purple' : 'teal'"
                rounded="md"
              >
                {{ person.tipoDocumento.nombre }}
              </v-chip>

              <div class="personas-mobile-data mt-4">
                <div><v-icon size="17">mdi-email-outline</v-icon><span>{{ person.correo || '—' }}</span></div>
                <div><v-icon size="17">mdi-phone-outline</v-icon><span>{{ person.telefono || '—' }}</span></div>
                <div><v-icon size="17">mdi-map-marker-outline</v-icon><span>{{ person.direccion || '—' }}</span></div>
              </div>
            </v-card-text>
            <v-divider />
            <v-card-actions class="justify-end py-2 px-3">
              <v-btn icon="mdi-pencil" size="small" variant="text" color="primary" :disabled="!canEdit" aria-label="Editar" @click="openEdit(person)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" :disabled="!canDelete" aria-label="Eliminar" @click="askDelete(person)" />
            </v-card-actions>
          </v-card>
        </div>
      </div>

      <div class="personas-desktop-list">
        <v-table>
          <thead>
            <tr class="personas-table-header">
              <th>N° Documento</th>
              <th>Tipo</th>
              <th>Nombre / Razón Social</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Estado</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center py-12">
                <v-progress-circular indeterminate color="primary" size="40" width="4" />
              </td>
            </tr>
            <tr v-else-if="!paginatedPeople.length">
              <td colspan="8" class="text-center py-12">
                <v-icon size="56" color="medium-emphasis">mdi-account-off</v-icon>
                <div class="text-h6 mt-3">No hay registros</div>
                <div class="text-body-2 text-medium-emphasis">Busca un documento o regístralo manualmente.</div>
              </td>
            </tr>
            <tr
              v-for="(person, index) in paginatedPeople"
              v-else
              :key="`${person.tipo}-${person.id}`"
              :class="{ 'personas-row-alternate': index % 2 === 0 }"
            >
              <td><span class="font-weight-medium">{{ person.numeroDocumento }}</span></td>
              <td>
                <v-chip
                  size="x-small"
                  variant="tonal"
                  :color="person.tipoDocumento.nombre === 'RUC' ? 'deep-purple' : 'teal'"
                  class="font-weight-bold"
                  rounded="md"
                >
                  {{ person.tipoDocumento.nombre }}
                </v-chip>
              </td>
              <td>
                <div class="d-flex align-center ga-2">
                  <v-avatar size="32" color="primary" variant="tonal">
                    <v-icon size="16">{{ person.tipoDocumento.nombre === 'RUC' ? 'mdi-domain' : 'mdi-account' }}</v-icon>
                  </v-avatar>
                  <span class="font-weight-medium">{{ person.nombre }}</span>
                </div>
              </td>
              <td><div class="personas-cell-icon"><v-icon size="14">mdi-email-outline</v-icon><span>{{ person.correo || '—' }}</span></div></td>
              <td><div class="personas-cell-icon"><v-icon size="14">mdi-phone-outline</v-icon><span>{{ person.telefono || '—' }}</span></div></td>
              <td><div class="personas-cell-icon personas-address"><v-icon size="14">mdi-map-marker-outline</v-icon><span>{{ person.direccion || '—' }}</span></div></td>
              <td>
                <v-chip :color="person.activo ? 'success' : 'error'" size="x-small" variant="flat" class="text-white font-weight-bold">
                  <v-icon start size="10">{{ person.activo ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
                  {{ person.activo ? 'ACTIVO' : 'INACTIVO' }}
                </v-chip>
              </td>
              <td class="text-center text-no-wrap">
                <v-btn icon="mdi-pencil" size="x-small" variant="text" color="primary" :disabled="!canEdit" aria-label="Editar" @click="openEdit(person)" />
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" :disabled="!canDelete" aria-label="Eliminar" @click="askDelete(person)" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <div class="personas-pagination">
        <div class="text-body-2 text-medium-emphasis">Mostrando {{ paginatedPeople.length }} de {{ people.length }}</div>
        <v-pagination
          v-model="page"
          :length="totalPages"
          :total-visible="5"
          color="primary"
          variant="tonal"
          rounded="lg"
          size="small"
        />
      </div>
    </v-card>

    <PersonFormDialog
      v-model="formDialog"
      :role="role"
      :person="editingPerson"
      :document-types="documentTypes"
      @saved="onSaved"
    />

    <v-dialog v-model="deleteDialog" max-width="420" persistent>
      <v-card class="rounded-xl overflow-hidden" elevation="24">
        <v-card-item class="delete-header pa-5">
          <div class="d-flex align-center ga-4">
            <v-avatar color="rgba(255,255,255,0.2)" size="48">
              <v-icon color="white" size="30">mdi-alert-octagram-outline</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold text-white">Confirmar eliminación</div>
              <div class="text-white text-body-2">{{ role === 'CLIENTE' ? 'Cliente' : 'Proveedor' }}: {{ deletingPerson?.nombre }}</div>
            </div>
          </div>
        </v-card-item>
        <v-card-text class="pa-6 text-center">
          <v-icon size="58" color="error">mdi-delete-empty-outline</v-icon>
          <div class="mt-3">¿Estás seguro de eliminar este registro?</div>
          <div class="text-body-2 text-medium-emphasis mt-1">Esta acción no se puede deshacer.</div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn variant="text" :disabled="deleting" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" min-width="130" :loading="deleting" @click="removePerson">
            Eliminar<v-icon end>mdi-trash-can-outline</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="noticeVisible" color="success">{{ notice }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { documentosApi, personasApi } from '@/core/api/administracion.api'
import { getApiErrorMessage } from '@/core/api/api-error'
import { Permiso } from '@/core/constants/permisos'
import type { PersonaRegistro, TipoDocumento, TipoPersona } from '@/core/types/administracion.types'
import { useAuthStore } from '@/modules/auth/auth.store'
import PersonFormDialog from '@/modules/personas/components/PersonFormDialog.vue'

const auth = useAuthStore()
const role = ref<TipoPersona>('CLIENTE')
const search = ref('')
const apiDocument = ref('')
const people = ref<PersonaRegistro[]>([])
const documentTypes = ref<TipoDocumento[]>([])
const loading = ref(false)
const consulting = ref(false)
const deleting = ref(false)
const error = ref('')
const formDialog = ref(false)
const deleteDialog = ref(false)
const editingPerson = ref<Partial<PersonaRegistro> | null>(null)
const deletingPerson = ref<PersonaRegistro | null>(null)
const notice = ref('')
const noticeVisible = ref(false)
const page = ref(1)
const perPage = 15
let searchTimer: ReturnType<typeof setTimeout> | null = null

const canManage = computed(() => auth.puede(Permiso.PERSONAS_GESTIONAR))
const canCreate = canManage
const canEdit = canManage
const canDelete = canManage
const validApiDocument = computed(() => /^(\d{8}|\d{11})$/.test(apiDocument.value))
const totalPages = computed(() => Math.max(1, Math.ceil(people.value.length / perPage)))
const paginatedPeople = computed(() => {
  const start = (page.value - 1) * perPage
  return people.value.slice(start, start + perPage)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await personasApi.listar(role.value, search.value.trim())
    people.value = data
    if (page.value > totalPages.value) page.value = totalPages.value
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo cargar la lista')
  } finally {
    loading.value = false
  }
}

function debounceSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 500)
}

function changeRole() {
  if (searchTimer) clearTimeout(searchTimer)
  search.value = ''
  apiDocument.value = ''
  page.value = 1
  load()
}

function sanitizeApiDocument(value: string) {
  apiDocument.value = String(value || '').replace(/\D/g, '').slice(0, 11)
}

async function consultDocument() {
  if (!validApiDocument.value || consulting.value) return
  consulting.value = true
  error.value = ''
  try {
    const tipo = apiDocument.value.length === 8 ? 'DNI' : 'RUC'
    const { data } = await documentosApi.consultar(tipo, apiDocument.value)
    const { data: created } = await personasApi.crear({
      tipo: role.value,
      nombre: data.tipoDocumento === 'DNI' ? data.nombreCompleto : data.razonSocial,
      idTipoDocumento: data.idTipoDocumento,
      numeroDocumento: data.numeroDocumento,
      direccion: data.tipoDocumento === 'RUC' ? data.direccion : null,
      ubigeo: data.tipoDocumento === 'RUC' ? data.ubigeo : null,
      correo: null,
      telefono: null,
      activo: true,
      ...(role.value === 'PROVEEDOR' ? { aplicaPercepcionPorDefecto: false } : {}),
    })
    notice.value = created.message
    noticeVisible.value = true
    apiDocument.value = ''
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo consultar el documento. Puedes usar el registro manual.')
  } finally {
    consulting.value = false
  }
}

function openManualModal() {
  editingPerson.value = null
  formDialog.value = true
}

async function openEdit(person: PersonaRegistro) {
  if (!canEdit.value) return
  error.value = ''
  try {
    const { data } = await personasApi.obtener(person.tipo, person.id)
    editingPerson.value = data
    formDialog.value = true
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo cargar el registro')
  }
}

function askDelete(person: PersonaRegistro) {
  if (!canDelete.value) return
  deletingPerson.value = person
  deleteDialog.value = true
}

async function removePerson() {
  if (!deletingPerson.value) return
  deleting.value = true
  error.value = ''
  try {
    const { data } = await personasApi.eliminar(deletingPerson.value.tipo, deletingPerson.value.id)
    notice.value = data.message
    noticeVisible.value = true
    deleteDialog.value = false
    deletingPerson.value = null
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo eliminar el registro')
    deleteDialog.value = false
  } finally {
    deleting.value = false
  }
}

async function onSaved(message: string) {
  notice.value = message
  noticeVisible.value = true
  apiDocument.value = ''
  await load()
}

onMounted(async () => {
  try {
    const { data } = await documentosApi.tipos()
    documentTypes.value = data
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar los tipos de documento')
  }
  await load()
})

onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
</script>

<style scoped>
.personas-page { width: 100%; }
.personas-api-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: rgb(var(--v-theme-primary)); font-size: 0.875rem; font-weight: 800; }
.personas-api-bar { display: grid; grid-template-columns: minmax(280px, 1fr) auto; align-items: center; gap: 12px; }
.personas-api-bar :deep(.v-input), .personas-list-toolbar :deep(.v-input) { width: 100%; }
.personas-list-toolbar { display: grid; grid-template-columns: auto minmax(200px, 1fr) auto auto; align-items: center; gap: 12px; border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); background: rgba(var(--v-theme-surface-variant), 0.18); }
.personas-list-count { display: flex; align-items: center; white-space: nowrap; }
.personas-table-header { background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-primary-darken-1))); }
.personas-table-header th { height: 58px !important; color: white !important; font-size: 0.875rem; font-weight: 700 !important; white-space: nowrap; }
.personas-desktop-list tbody td { height: 70px !important; font-size: 0.875rem; }
.personas-row-alternate { background: rgba(var(--v-theme-primary), 0.045); }
.personas-cell-icon { display: flex; align-items: center; gap: 5px; color: rgb(var(--v-theme-on-surface)); }
.personas-cell-icon .v-icon { color: rgb(var(--v-theme-on-surface-variant)); flex: 0 0 auto; }
.personas-address { max-width: 200px; }
.personas-address span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.personas-pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 68px; padding: 12px 24px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); background: rgba(var(--v-theme-surface-variant), 0.18); }
.personas-mobile-list { display: none; }
.personas-mobile-data { display: grid; gap: 8px; color: rgb(var(--v-theme-on-surface-variant)); }
.personas-mobile-data > div { display: flex; align-items: flex-start; gap: 8px; }
.personas-empty { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; text-align: center; }
.delete-header { background: linear-gradient(135deg, #c71a1a, #db4b4b); }
.min-width-0 { min-width: 0; }
@media (max-width: 900px) {
  .personas-api-bar, .personas-list-toolbar { grid-template-columns: minmax(0, 1fr); }
  .personas-api-add, .personas-role-toggle { width: 100%; }
  .personas-role-toggle :deep(.v-btn) { flex: 1; }
  .personas-list-count { display: none; }
  .personas-desktop-list { display: none; }
  .personas-mobile-list { display: block; }
  .personas-pagination { flex-direction: column; }
}
</style>
