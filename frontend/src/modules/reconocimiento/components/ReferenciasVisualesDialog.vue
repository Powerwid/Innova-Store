<template>
  <v-dialog v-model="open" max-width="860" scrollable :persistent="busy">
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center ga-2 pa-4"><v-icon color="primary">mdi-camera-plus-outline</v-icon><span class="text-subtitle-1 font-weight-bold">Fotos de referencia</span><v-spacer /><v-btn icon="mdi-close" variant="text" :disabled="busy" aria-label="Cerrar fotos de referencia" @click="open = false" /></v-card-title>
      <v-divider />
      <v-card-text class="pa-5">
        <div class="text-subtitle-1 font-weight-bold">{{ producto?.nombre }}</div>
        <p class="text-body-2 text-medium-emphasis mb-4">Registra varias fotos reales de este producto desde distintos ángulos. Cada foto debe mostrar solo este producto y su presentación.</p>
        <v-alert v-if="status && !status.configurado" type="info" variant="tonal" density="compact" class="mb-4">Puedes guardar fotos ahora. Quedarán pendientes hasta que se conecte el servicio de reconocimiento.</v-alert>
        <v-alert v-else-if="status && !status.disponible" type="warning" variant="tonal" density="compact" class="mb-4">El servicio de reconocimiento no está disponible. Las fotos guardadas se procesarán cuando vuelva a estar conectado.</v-alert>
        <v-alert v-else-if="healthError" type="warning" variant="tonal" density="compact" class="mb-4">No se pudo consultar el servicio de reconocimiento. Puedes guardar fotos y revisar su estado más tarde.</v-alert>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
        <v-alert v-if="notice" type="success" variant="tonal" density="compact" class="mb-4">{{ notice }}</v-alert>
        <template v-if="canManage && producto?.estado">
          <CapturaProducto v-if="open" v-model="file" :disabled="busy" />
          <v-btn class="mt-4" color="primary" variant="flat" prepend-icon="mdi-upload" :loading="busy && action === 'upload'" :disabled="!file || busy" @click="upload">Guardar foto de referencia</v-btn>
        </template>
        <v-alert v-else-if="!producto?.estado" type="warning" variant="tonal" density="compact">Activa el producto para registrar nuevas fotos.</v-alert>
        <div class="d-flex align-center flex-wrap ga-2 mt-5 mb-3"><strong>Fotos registradas ({{ total }})</strong><v-spacer /><v-btn variant="text" size="small" prepend-icon="mdi-refresh" :disabled="busy" :loading="loading" @click="reload">Actualizar</v-btn><v-btn v-if="canManage && references.some(item => item.activo)" variant="text" size="small" :disabled="busy || loading" @click="reindex">Reprocesar fotos</v-btn></div>
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />
        <div v-if="references.length" class="reference-grid">
          <v-card v-for="reference in references" :key="reference.idReferencia" variant="outlined" rounded="lg">
            <v-img :src="reference.imagenUrl" height="155" cover :alt="`Referencia ${reference.idReferencia} de ${producto?.nombre}`"><template #error><div class="d-flex align-center justify-center h-100"><v-icon size="40">mdi-image-off-outline</v-icon></div></template></v-img>
            <v-card-text class="pa-3"><v-chip size="small" variant="tonal" :color="stateColor(reference)">{{ stateLabel(reference) }}</v-chip><div class="text-caption text-medium-emphasis mt-2">Foto #{{ reference.idReferencia }}</div><div v-if="reference.estado === 'ERROR'" class="text-caption text-error mt-2">No se pudo procesar. Prueba una foto nueva o vuelve a intentarlo.</div></v-card-text>
            <v-card-actions v-if="canManage && reference.activo" class="pt-0"><v-btn v-if="reference.estado === 'ERROR'" size="small" color="primary" :disabled="busy" @click="retry(reference)">Reintentar</v-btn><v-spacer /><v-btn size="small" color="error" variant="text" :disabled="busy" :aria-label="`Retirar foto ${reference.idReferencia}`" @click="removing = reference">Retirar</v-btn></v-card-actions>
          </v-card>
        </div>
        <p v-else-if="!loading && !error" class="text-body-2 text-medium-emphasis py-5 text-center">Este producto todavía no tiene fotos de referencia.</p>
        <v-pagination v-if="total > 12" v-model="page" :length="Math.ceil(total / 12)" :total-visible="5" size="small" class="mt-3" :disabled="busy" />
        <p v-if="references.some(item => item.estado === 'PENDIENTE' || item.estado === 'PROCESANDO')" class="text-caption text-medium-emphasis mt-3" role="status">Las fotos estarán listas para buscar cuando aparezcan como disponibles.</p>
      </v-card-text>
      <v-divider /><v-card-actions class="pa-4"><v-spacer /><v-btn :disabled="busy" @click="open = false">Cerrar</v-btn></v-card-actions>
    </v-card>
    <v-dialog :model-value="!!removing" max-width="430" :persistent="busy" @update:model-value="removing = null"><v-card rounded="xl"><v-card-title>Retirar foto de referencia</v-card-title><v-card-text>Esta foto dejará de usarse para reconocer el producto.</v-card-text><v-card-actions><v-spacer /><v-btn :disabled="busy" @click="removing = null">Cancelar</v-btn><v-btn color="error" :loading="busy" @click="remove">Retirar foto</v-btn></v-card-actions></v-card></v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getApiErrorMessage } from '@/core/api/api-error'
import { Permiso } from '@/core/constants/permisos'
import { useAuthStore } from '@/modules/auth/auth.store'
import type { Producto } from '@/modules/logistica/logistica.types'
import { reconocimientoApi } from '../reconocimiento.api'
import type { EstadoReconocimiento, ReferenciaVisual } from '../reconocimiento.types'
import CapturaProducto from './CapturaProducto.vue'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ producto: Pick<Producto, 'idProducto' | 'nombre' | 'estado'> | null }>()
const auth = useAuthStore()
const canManage = computed(() => auth.puede(Permiso.LOGISTICA_GESTIONAR))
const file = ref<File | null>(null)
const references = ref<ReferenciaVisual[]>([])
const status = ref<EstadoReconocimiento | null>(null)
const healthError = ref(false)
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const busy = ref(false)
const action = ref('')
const error = ref('')
const notice = ref('')
const removing = ref<ReferenciaVisual | null>(null)
let request = 0
let context = 0
let controller: AbortController | undefined
let poll: ReturnType<typeof setTimeout> | undefined

function stopReads() { request++; controller?.abort(); if (poll) clearTimeout(poll); poll = undefined }
function stateLabel(item: ReferenciaVisual) {
  if (!item.activo) return item.estado === 'RETIRADA' ? 'Retirada' : 'Retirando'
  return { PENDIENTE: 'Pendiente', PROCESANDO: 'Procesando', DISPONIBLE: 'Disponible', ERROR: 'Error', RETIRADA: 'Retirada' }[item.estado]
}
function stateColor(item: ReferenciaVisual) {
  if (!item.activo) return 'grey'
  return item.estado === 'DISPONIBLE' ? 'success' : item.estado === 'ERROR' ? 'error' : 'warning'
}
async function reload() {
  if (!open.value || !props.producto) return
  stopReads()
  const current = request
  controller = new AbortController()
  loading.value = true
  const responses = await Promise.allSettled([
    reconocimientoApi.listar(props.producto.idProducto, page.value, controller.signal),
    reconocimientoApi.estado(controller.signal),
  ])
  if (current !== request) return
  const [list, health] = responses
  if (list.status === 'fulfilled') {
    references.value = list.value.data.data; total.value = list.value.data.total; error.value = ''
  } else error.value = getApiErrorMessage(list.reason, 'No se pudieron cargar las fotos de referencia.')
  status.value = health.status === 'fulfilled' ? health.value.data : null
  healthError.value = health.status === 'rejected'
  loading.value = false
  if (list.status === 'fulfilled' && status.value?.configurado && references.value.some(item => ['PENDIENTE', 'PROCESANDO'].includes(item.estado))) poll = setTimeout(() => void reload(), 5000)
}
async function mutate(name: string, work: () => Promise<unknown>, message: string) {
  if (busy.value || !canManage.value || !props.producto) return
  const current = context
  stopReads(); loading.value = false; busy.value = true; action.value = name; error.value = ''; notice.value = ''
  try {
    await work()
    if (current !== context) return
    if (name === 'upload') file.value = null
    removing.value = null; notice.value = message
    await reload()
  } catch (cause) { if (current === context) error.value = getApiErrorMessage(cause, 'No se pudo actualizar la foto de referencia.') }
  finally { if (current === context) { busy.value = false; action.value = '' } }
}
function upload() {
  const id = props.producto?.idProducto, photo = file.value
  if (id && photo) void mutate('upload', () => reconocimientoApi.registrar(id, photo), 'Foto guardada. Revisa su estado de procesamiento en la lista.')
}
function retry(item: ReferenciaVisual) { void mutate('retry', () => reconocimientoApi.reintentar(item.idReferencia), 'Foto pendiente de procesamiento.') }
function remove() { const item = removing.value; if (item) void mutate('remove', () => reconocimientoApi.retirar(item.idReferencia), 'Foto retirada del reconocimiento.') }
function reindex() { const id = props.producto?.idProducto; if (id) void mutate('reindex', () => reconocimientoApi.reindexar(id), 'Fotos pendientes de procesamiento.') }
watch([open, () => props.producto?.idProducto], () => {
  context++; stopReads(); references.value = []; status.value = null; healthError.value = false; total.value = 0; page.value = 1; file.value = null; removing.value = null; error.value = notice.value = ''; loading.value = busy.value = false
  if (open.value) void reload()
}, { immediate: true })
watch(page, () => { if (open.value) void reload() })
onBeforeUnmount(() => { context++; stopReads() })
</script>

<style scoped>
.reference-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
</style>
