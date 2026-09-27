<template>
  <div class="logistica-page">
    <v-card class="mb-5 rounded-xl" elevation="0" border>
      <v-card-text class="pa-4">
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <v-icon icon="mdi-shape-outline" color="primary" size="26" />
          <div class="text-h6 font-weight-bold">{{ standaloneUnits ? 'Unidades de medida' : 'Tipos y categorías' }}</div>
          <v-chip color="primary" variant="tonal" size="small">{{ total }}</v-chip>
          <v-spacer />
          <v-btn v-if="canManage" color="primary" prepend-icon="mdi-plus" rounded="lg" @click="openCreate">Nuevo {{ singular.toLowerCase() }}</v-btn>
        </div>
        <v-tabs v-if="!standaloneUnits" v-model="resource" color="primary" show-arrows class="mb-4">
          <v-tab value="tipos-producto" prepend-icon="mdi-package-variant">Tipos de producto</v-tab>
          <v-tab value="categorias" prepend-icon="mdi-tag-multiple-outline">Categorías</v-tab>
        </v-tabs>
        <div class="logistica-toolbar">
          <v-text-field v-model="search" class="logistica-search" placeholder="Buscar por nombre..."
            prepend-inner-icon="mdi-magnify" variant="outlined" density="comfortable" rounded="lg" clearable hide-details
            @update:model-value="scheduleSearch" @keyup.enter="searchNow" />
          <v-select v-model="status" class="logistica-filter" :items="['Todos', 'Activos', 'Inactivos']"
            variant="outlined" density="comfortable" rounded="lg" hide-details />
          <v-btn icon="mdi-refresh" color="primary" variant="tonal" rounded="lg" :loading="loading"
            aria-label="Actualizar catálogo" @click="load" />
          <span class="logistica-count"><v-icon size="19">mdi-format-list-numbered</v-icon>{{ total }} registros</span>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
    <v-card rounded="xl" elevation="0" border class="overflow-hidden">
      <div v-if="loading" class="text-center py-14"><v-progress-circular indeterminate color="primary" /></div>
      <template v-else-if="items.length">
        <v-table hover class="logistica-table logistica-desktop">
          <thead><tr><th style="width: 90px">ID</th><th>Nombre</th><th v-if="resource === 'categorias'">Color</th>
            <th v-if="resource === 'unidades-medida'">Símbolo</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
          <tbody><tr v-for="item in items" :key="itemId(item)">
            <td>#{{ itemId(item) }}</td><td class="font-weight-bold">{{ item.nombre }}</td>
            <td v-if="resource === 'categorias'"><span class="d-inline-flex align-center ga-2">
              <span class="color-dot" :style="{ background: itemColor(item) || '#c4c4c4' }" />{{ itemColor(item) || 'Sin color' }}
            </span></td>
            <td v-if="resource === 'unidades-medida'">{{ itemSymbol(item) }}</td>
            <td><v-chip size="small" :color="item.estado ? 'success' : 'error'" variant="tonal">{{ item.estado ? 'Activo' : 'Inactivo' }}</v-chip></td>
            <td class="text-end"><v-btn v-if="canManage" icon="mdi-pencil-outline" size="small" variant="text"
              color="primary" :aria-label="`Editar ${item.nombre}`" @click="openEdit(item)" />
              <v-btn v-if="canManage" icon="mdi-delete-outline" size="small" variant="text" color="error"
                :aria-label="`Eliminar ${item.nombre}`" @click="confirmDelete(item)" /></td>
          </tr></tbody>
        </v-table>
        <div class="logistica-mobile pa-3">
          <v-card v-for="item in items" :key="itemId(item)" rounded="lg" variant="outlined" class="mb-3">
            <v-card-text class="d-flex align-center ga-3 pa-3">
              <v-avatar color="primary" variant="tonal" size="40"><v-icon :icon="icon" /></v-avatar>
              <div class="flex-grow-1 min-w-0">
                <div class="font-weight-bold text-truncate">{{ item.nombre }}</div>
                <div class="text-caption text-medium-emphasis">#{{ itemId(item) }} · {{ itemSymbol(item) || itemColor(item) || singular }}</div>
                <v-chip size="x-small" :color="item.estado ? 'success' : 'error'" variant="tonal">{{ item.estado ? 'Activo' : 'Inactivo' }}</v-chip>
              </div>
              <div v-if="canManage" class="d-flex">
                <v-btn icon="mdi-pencil-outline" variant="text" size="small" color="primary" :aria-label="`Editar ${item.nombre}`" @click="openEdit(item)" />
                <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" :aria-label="`Eliminar ${item.nombre}`" @click="confirmDelete(item)" />
              </div>
            </v-card-text>
          </v-card>
        </div>
      </template>
      <div v-else class="logistica-empty"><v-icon :icon="icon" size="48" class="mb-3" /><div>No se encontraron {{ title.toLowerCase() }}</div></div>
      <v-divider />
      <div class="d-flex align-center justify-space-between pa-3">
        <span class="text-caption text-medium-emphasis">Mostrando {{ items.length }} de {{ total }}</span>
        <v-pagination v-if="total > limit" v-model="page" :length="Math.ceil(total / limit)" :total-visible="5" size="small" color="primary" />
      </div>
    </v-card>

    <v-dialog v-model="dialog" max-width="560" persistent>
      <v-card rounded="xl" class="overflow-hidden">
        <v-card-title class="logistica-dialog-title"><span class="logistica-dialog-icon"><v-icon :icon="editing ? 'mdi-pencil-outline' : 'mdi-plus'" /></span>
          {{ editing ? 'Editar' : 'Nuevo' }} {{ singular.toLowerCase() }}
          <v-spacer /><v-btn icon="mdi-close" variant="text" color="on-primary" aria-label="Cerrar" @click="dialog = false" />
        </v-card-title>
        <v-card-text class="pa-5">
          <v-alert v-if="formError" type="error" variant="tonal" class="mb-4">{{ formError }}</v-alert>
          <label class="logistica-field-label" for="log-catalog-name">Nombre *</label>
          <v-text-field id="log-catalog-name" v-model="form.nombre" :placeholder="`Nombre de ${singular.toLowerCase()}`"
            density="comfortable" variant="outlined" maxlength="100" @keyup.enter="save" />
          <template v-if="resource === 'categorias'">
            <label class="logistica-field-label" for="log-catalog-color">Color (opcional)</label>
            <v-text-field id="log-catalog-color" v-model="form.color" placeholder="#F58220"
              density="comfortable" variant="outlined" maxlength="7"><template #prepend-inner>
                <span class="color-dot" :style="{ background: /^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : '#c4c4c4' }" />
              </template></v-text-field>
          </template>
          <template v-if="resource === 'unidades-medida'">
            <label class="logistica-field-label" for="log-catalog-symbol">Símbolo *</label>
            <v-text-field id="log-catalog-symbol" v-model="form.simbolo" placeholder="Ej.: KG"
              density="comfortable" variant="outlined" maxlength="10" @keyup.enter="save" />
          </template>
          <div class="d-flex align-center justify-space-between border-t pt-3">
            <div><div class="font-weight-bold">Estado</div><div class="text-body-2 text-medium-emphasis">Disponible para nuevos productos.</div></div>
            <v-switch v-model="form.estado" color="primary" hide-details aria-label="Estado del catálogo" />
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 justify-end border-t">
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" min-width="130" :loading="saving" @click="save">{{ editing ? 'Actualizar' : 'Guardar' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="430">
      <v-card rounded="xl"><v-card-title class="pa-4">Eliminar {{ singular.toLowerCase() }}</v-card-title>
        <v-card-text>¿Eliminar «{{ deleting?.nombre }}»? Si está en uso, puedes desactivarlo.</v-card-text>
        <v-card-actions class="pa-4 justify-end"><v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" :loading="saving" @click="remove">Eliminar</v-btn></v-card-actions></v-card>
    </v-dialog>
    <v-snackbar v-model="noticeVisible" color="success">{{ notice }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getApiErrorMessage } from '@/core/api/api-error'
import { Permiso } from '@/core/constants/permisos'
import { useAuthStore } from '@/modules/auth/auth.store'
import { catalogosApi } from '../logistica.api'
import type { Catalogo, RecursoCatalogo } from '../logistica.types'
import '../logistica.css'

const auth = useAuthStore()
const route = useRoute()
const canManage = computed(() => auth.puede(Permiso.LOGISTICA_GESTIONAR))
const standaloneUnits = computed(() => route.name === 'logistica-unidades-medida')
const resource = ref<RecursoCatalogo>(standaloneUnits.value ? 'unidades-medida' : 'tipos-producto')
const title = computed(() => ({ 'tipos-producto': 'Tipos de producto', categorias: 'Categorías', 'unidades-medida': 'Unidades de medida' })[resource.value])
const singular = computed(() => ({ 'tipos-producto': 'Tipo de producto', categorias: 'Categoría', 'unidades-medida': 'Unidad de medida' })[resource.value])
const icon = computed(() => ({ 'tipos-producto': 'mdi-package-variant', categorias: 'mdi-tag-outline', 'unidades-medida': 'mdi-ruler-square' })[resource.value])
const items = ref<Catalogo[]>([])
const search = ref('')
const status = ref('Todos')
const page = ref(1)
const limit = 50
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const editing = ref<Catalogo | null>(null)
const deleting = ref<Catalogo | null>(null)
const error = ref('')
const formError = ref('')
const notice = ref('')
const noticeVisible = ref(false)
const form = reactive({ nombre: '', color: '', simbolo: '', estado: true })
let timer: ReturnType<typeof setTimeout> | undefined
let requestId = 0
const idKeys = { 'tipos-producto': 'idTipoProducto', categorias: 'idCategoria', 'unidades-medida': 'idUnidadMedida' } as const
function itemId(item: Catalogo) { return (item as unknown as Record<string, number>)[idKeys[resource.value]] }
function itemColor(item: Catalogo) { return 'color' in item ? item.color : null }
function itemSymbol(item: Catalogo) { return 'simbolo' in item ? item.simbolo : '' }
async function load() {
  const current = ++requestId
  loading.value = true
  error.value = ''
  try {
    const { data } = await catalogosApi.listar(resource.value, {
      pagina: page.value, limite: limit, buscar: search.value.trim() || undefined,
      estado: status.value === 'Todos' ? undefined : status.value === 'Activos',
    })
    if (current !== requestId) return
    items.value = data.data
    total.value = data.total
  } catch (cause) {
    if (current === requestId) error.value = getApiErrorMessage(cause, 'No se pudo cargar el catálogo')
  } finally { if (current === requestId) loading.value = false }
}
function searchNow() { if (timer) clearTimeout(timer); if (page.value !== 1) page.value = 1; else void load() }
function scheduleSearch() { if (timer) clearTimeout(timer); timer = setTimeout(searchNow, 350) }
function openCreate() {
  editing.value = null
  Object.assign(form, { nombre: '', color: '', simbolo: '', estado: true })
  formError.value = ''
  dialog.value = true
}
function openEdit(item: Catalogo) {
  editing.value = item
  Object.assign(form, { nombre: item.nombre, color: itemColor(item) ?? '', simbolo: itemSymbol(item), estado: item.estado })
  formError.value = ''
  dialog.value = true
}
async function save() {
  if (!form.nombre.trim()) { formError.value = 'Ingresa un nombre'; return }
  if (resource.value === 'categorias' && form.color.trim() && !/^#[0-9a-fA-F]{6}$/.test(form.color.trim())) {
    formError.value = 'El color debe tener el formato #F58220'; return
  }
  if (resource.value === 'unidades-medida' && !form.simbolo.trim()) { formError.value = 'Ingresa el símbolo'; return }
  const payload: Record<string, unknown> = { nombre: form.nombre.trim(), estado: form.estado }
  if (resource.value === 'categorias') payload.color = form.color.trim() || null
  if (resource.value === 'unidades-medida') payload.simbolo = form.simbolo.trim()
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) await catalogosApi.actualizar(resource.value, itemId(editing.value), payload)
    else await catalogosApi.crear(resource.value, payload)
    dialog.value = false
    notice.value = editing.value ? 'Registro actualizado' : 'Registro creado'
    noticeVisible.value = true
    await load()
  } catch (cause) { formError.value = getApiErrorMessage(cause, 'No se pudo guardar') }
  finally { saving.value = false }
}
function confirmDelete(item: Catalogo) { deleting.value = item; deleteDialog.value = true }
async function remove() {
  if (!deleting.value) return
  saving.value = true
  error.value = ''
  try {
    await catalogosApi.eliminar(resource.value, itemId(deleting.value))
    deleteDialog.value = false
    notice.value = 'Registro eliminado'
    noticeVisible.value = true
    await load()
  } catch (cause) { deleteDialog.value = false; error.value = getApiErrorMessage(cause, 'No se pudo eliminar') }
  finally { saving.value = false }
}
watch([resource, status], () => { if (page.value !== 1) page.value = 1; else void load() })
watch(standaloneUnits, (units) => { resource.value = units ? 'unidades-medida' : 'tipos-producto' })
watch(page, load, { immediate: true })
onUnmounted(() => { if (timer) clearTimeout(timer); requestId++ })
</script>

<style scoped>
.color-dot { display: inline-block; width: 20px; height: 20px; border-radius: 5px; border: 1px solid rgba(var(--v-theme-on-surface), .15); flex: none; }
</style>
