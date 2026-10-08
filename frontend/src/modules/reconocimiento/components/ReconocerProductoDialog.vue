<template>
  <v-dialog v-model="open" max-width="780" scrollable>
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center ga-2 pa-4">
        <v-icon color="primary">mdi-image-search-outline</v-icon>
        <span class="text-subtitle-1 font-weight-bold">Reconocer producto</span>
        <v-spacer /><v-btn icon="mdi-close" variant="text" aria-label="Cerrar reconocimiento" @click="open = false" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-5">
        <p class="text-body-2 text-medium-emphasis mb-4">Fotografía un solo producto. Elige la coincidencia correcta y confirma la cantidad o el peso.</p>
        <CapturaProducto v-if="open" v-model="file" :disabled="loading" />
        <v-btn class="mt-4" color="primary" variant="flat" prepend-icon="mdi-magnify" :loading="loading" :disabled="!file || !idSucursal" @click="search">Buscar coincidencias</v-btn>
        <p v-if="loading" role="status" class="text-body-2 text-medium-emphasis mt-3">Buscando… La primera consulta puede tardar mientras se carga el modelo.</p>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4">{{ error }}</v-alert>
        <template v-if="result">
          <v-alert v-if="!result.candidatos.length" type="info" variant="tonal" class="mt-4">{{ result.estado === 'SIN_REFERENCIAS' ? 'No hay fotos de referencia disponibles para esta sucursal. Regístralas desde Productos y vuelve a intentar.' : 'No se encontraron productos similares. Prueba otra foto o selecciona el producto manualmente.' }}</v-alert>
          <template v-else>
            <div class="text-subtitle-2 font-weight-bold mt-5 mb-2">Selecciona el producto correcto</div>
            <div class="candidate-list" role="group" aria-label="Productos sugeridos">
              <button v-for="candidate in result.candidatos" :key="candidate.idProductoSucursal" type="button" class="candidate" :class="{ 'candidate-selected': selectedId === candidate.idProductoSucursal }" :aria-pressed="selectedId === candidate.idProductoSucursal" @click="select(candidate)">
                <v-img :src="`/api/reconocimiento/referencias/${candidate.idReferencia}/imagen`" width="64" height="64" cover class="rounded-lg flex-grow-0 flex-shrink-0" :alt="candidate.nombre"><template #error><v-icon size="40">mdi-package-variant</v-icon></template></v-img>
                <div class="flex-grow-1 min-w-0"><div class="font-weight-bold">{{ candidate.nombre }}</div><div class="text-body-2 text-medium-emphasis">{{ money(price(candidate)) }} / {{ candidate.unidadMedida.simbolo }}</div><div class="text-caption text-medium-emphasis">{{ candidate.categoria.nombre }}</div></div>
                <v-icon :color="selectedId === candidate.idProductoSucursal ? 'primary' : 'medium-emphasis'">{{ selectedId === candidate.idProductoSucursal ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}</v-icon>
              </button>
            </div>
            <v-alert v-if="selected && selected.similitud < result.similitudMinima" type="warning" variant="tonal" density="compact" class="mt-3">La coincidencia visual es débil. Revisa el producto y su presentación antes de confirmar.</v-alert>
            <div v-if="selected" class="mt-4">
              <v-text-field v-model="quantity" :label="`Cantidad o peso (${selected.unidadMedida.simbolo})`" inputmode="decimal" variant="outlined" :error-messages="quantityError" hint="Ingresa la cantidad medida. La foto no calcula el peso." persistent-hint />
              <v-alert v-if="selectionIssue" type="warning" variant="tonal" density="compact">{{ selectionIssue }}</v-alert>
            </div>
          </template>
        </template>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4 flex-wrap">
        <v-btn variant="text" @click="open = false">Volver a selección manual</v-btn><v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-check" :disabled="!selected || !quantity.trim() || !!quantityError || !!selectionIssue || loading" @click="confirm">Confirmar y agregar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getApiErrorMessage } from '@/core/api/api-error'
import { reconocimientoApi } from '../reconocimiento.api'
import { validarCantidad } from '../imagen'
import type { CandidatoVisual, ResultadoReconocimiento, SeleccionVisual } from '../reconocimiento.types'
import CapturaProducto from './CapturaProducto.vue'

const open = defineModel<boolean>({ required: true })
const props = withDefaults(defineProps<{
  idSucursal: number | null
  precio?: 'venta' | 'compra'
  validarSeleccion?: (candidate: CandidatoVisual, cantidad: number) => string
}>(), { precio: 'venta' })
const emit = defineEmits<{ seleccionar: [selection: SeleccionVisual] }>()
const file = ref<File | null>(null)
const loading = ref(false)
const error = ref('')
const result = ref<ResultadoReconocimiento | null>(null)
const selectedId = ref<number | null>(null)
const quantity = ref('')
const selected = computed(() => result.value?.candidatos.find(item => item.idProductoSucursal === selectedId.value))
const quantityError = computed(() => selected.value && quantity.value ? validarCantidad(quantity.value) : '')
const amount = computed(() => Number(quantity.value.replace(',', '.')))
const selectionIssue = computed(() => selected.value ? props.validarSeleccion?.(selected.value, quantityError.value ? 0 : amount.value) ?? '' : '')
let request = 0
let controller: AbortController | undefined

function clearResults() {
  request++; controller?.abort(); controller = undefined
  loading.value = false; error.value = ''; result.value = null; selectedId.value = null; quantity.value = ''
}
function select(candidate: CandidatoVisual) { selectedId.value = candidate.idProductoSucursal; quantity.value = '' }
function price(candidate: CandidatoVisual) { return props.precio === 'compra' ? candidate.precioCompra : candidate.precioVenta }
function money(value: string) { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value)) }
async function search() {
  if (!file.value || !props.idSucursal || loading.value) return
  clearResults()
  const current = request
  const photo = file.value
  const branch = props.idSucursal
  controller = new AbortController()
  loading.value = true
  try {
    const response = await reconocimientoApi.buscar(photo, branch, controller.signal)
    if (current === request && open.value && props.idSucursal === branch && file.value === photo) result.value = response.data
  } catch (cause) {
    if (current === request) error.value = getApiErrorMessage(cause, 'No se pudo reconocer el producto. Intenta otra vez o selecciónalo manualmente.')
  } finally { if (current === request) loading.value = false }
}
function confirm() {
  if (!selected.value || validarCantidad(quantity.value) || selectionIssue.value || loading.value || !open.value) return
  emit('seleccionar', { candidato: selected.value, cantidad: amount.value })
}
watch(file, clearResults, { flush: 'sync' })
watch([open, () => props.idSucursal], () => { clearResults(); file.value = null }, { flush: 'sync' })
onBeforeUnmount(clearResults)
</script>

<style scoped>
.candidate-list { display: grid; gap: 8px; }
.candidate { display: flex; align-items: center; gap: 12px; padding: 12px; width: 100%; text-align: left; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 12px; }
.candidate:hover, .candidate-selected { background: rgba(var(--v-theme-primary), .06); border-color: rgb(var(--v-theme-primary)); }
.candidate:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
</style>
