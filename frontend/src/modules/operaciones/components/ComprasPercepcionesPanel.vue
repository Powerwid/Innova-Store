<template>
  <section aria-label="Historial de percepciones de compras">
    <v-card rounded="xl" elevation="0" border class="mb-4">
      <v-card-text class="pa-4">
        <div class="text-subtitle-1 font-weight-bold mb-3">Percepciones de compras</div>
        <form @submit.prevent="buscar">
          <div class="operaciones-toolbar">
            <v-text-field v-model="filtros.desde" type="date" label="Desde" class="operaciones-filter" variant="outlined" density="comfortable" hide-details />
            <v-text-field v-model="filtros.hasta" type="date" label="Hasta" class="operaciones-filter" variant="outlined" density="comfortable" hide-details />
            <v-text-field v-model="filtros.buscar" label="Proveedor o comprobante" class="operaciones-search" prepend-inner-icon="mdi-magnify" variant="outlined" density="comfortable" hide-details clearable />
            <v-btn type="submit" color="primary" prepend-icon="mdi-filter-outline" :loading="loading">Filtrar</v-btn>
            <v-btn icon="mdi-refresh" variant="tonal" color="primary" aria-label="Actualizar percepciones" :disabled="loading" @click="load" />
          </div>
        </form>
        <div class="d-flex flex-wrap ga-2 mt-3">
          <v-btn size="small" color="primary" variant="text" @click="esteMes">Este mes</v-btn>
          <v-btn size="small" color="primary" variant="text" @click="todoElHistorial">Todo el historial</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <div v-if="loading" class="text-center py-14" role="status" aria-label="Cargando percepciones"><v-progress-circular indeterminate color="primary" /></div>
    <template v-else-if="!error">
      <v-row class="mb-2">
        <v-col cols="12" md="6">
          <v-card class="operaciones-metric" rounded="xl" elevation="0" border>
            <v-card-text>
              <div class="d-flex align-center ga-2 text-medium-emphasis"><v-icon color="primary">mdi-percent-outline</v-icon>Total de percepciones</div>
              <div class="text-h4 font-weight-bold mt-2">{{ money(resumen.montoTotal) }}</div>
              <div class="text-caption text-medium-emphasis mt-2">{{ periodo }}{{ aplicados.buscar ? ` · ${aplicados.buscar}` : '' }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="operaciones-metric" rounded="xl" elevation="0" border><v-card-text><div class="text-medium-emphasis">Percepciones registradas</div><div class="text-h4 font-weight-bold mt-2">{{ resumen.numeroPercepciones }}</div></v-card-text></v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="operaciones-metric" rounded="xl" elevation="0" border><v-card-text><div class="text-medium-emphasis">Compras con percepción</div><div class="text-h4 font-weight-bold mt-2">{{ resumen.numeroCompras }}</div></v-card-text></v-card>
        </v-col>
      </v-row>
      <div class="text-body-2 text-medium-emphasis mb-4">El total incluye todas las percepciones del filtro, no solo las de esta página.</div>
      <v-card rounded="xl" elevation="0" border class="overflow-hidden">
        <template v-if="items.length">
          <v-table hover class="operaciones-table operaciones-desktop">
            <thead><tr><th>Registro</th><th>Fecha</th><th>Compra</th><th>Proveedor</th><th>Comprobante de compra</th><th>Comprobante de percepción</th><th class="text-end">Base</th><th class="text-end">Porcentaje</th><th class="text-end">Percepción</th></tr></thead>
            <tbody>
              <tr v-for="item in items" :key="item.idPercepcion">
                <td>#{{ item.idPercepcion }}</td><td>{{ fecha(item.fechaPercepcion) }}</td>
                <td><v-btn variant="text" size="small" color="primary" :aria-label="`Ver compra ${item.idCompra}`" @click="emit('verCompra', item.idCompra)">#{{ item.idCompra }}</v-btn></td>
                <td>{{ item.compra.nombreProveedor }}</td><td>{{ comprobante(item) }}</td><td>{{ item.numeroConstancia || 'Sin comprobante registrado' }}</td>
                <td class="text-end text-no-wrap">{{ money(item.baseCalculo) }}</td><td class="text-end">{{ porcentaje(item.porcentaje) }} %</td><td class="text-end text-no-wrap font-weight-bold">{{ money(item.monto) }}</td>
              </tr>
            </tbody>
          </v-table>
          <div class="operaciones-mobile pa-3">
            <v-card v-for="item in items" :key="item.idPercepcion" rounded="lg" variant="outlined" class="mb-3">
              <v-card-text>
                <div class="d-flex justify-space-between ga-2"><strong>Percepción #{{ item.idPercepcion }}</strong><strong>{{ money(item.monto) }}</strong></div>
                <div class="mt-2">{{ item.compra.nombreProveedor }}</div>
                <div class="text-caption text-medium-emphasis">{{ fecha(item.fechaPercepcion) }} · Compra {{ comprobante(item) }}</div>
                <div class="text-caption mt-2">Comprobante de percepción: {{ item.numeroConstancia || 'Sin registrar' }}</div>
                <div class="text-caption">Base: {{ money(item.baseCalculo) }} · {{ porcentaje(item.porcentaje) }} %</div>
                <v-btn variant="text" color="primary" size="small" class="mt-2" @click="emit('verCompra', item.idCompra)">Ver compra #{{ item.idCompra }}</v-btn>
              </v-card-text>
            </v-card>
          </div>
        </template>
        <div v-else class="operaciones-empty"><v-icon size="50">mdi-percent-outline</v-icon><div class="mt-2">No se encontraron percepciones para estos filtros.</div></div>
        <v-divider />
        <div class="d-flex align-center justify-space-between flex-wrap pa-3 ga-2"><span class="text-caption">Mostrando {{ items.length }} de {{ total }}</span><v-pagination v-if="total > limite" v-model="pagina" :length="Math.ceil(total / limite)" :total-visible="5" size="small" /></div>
      </v-card>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { getApiErrorMessage } from '@/core/api/api-error'
import { useRealtimeRefresh } from '@/core/realtime/useRealtimeRefresh'
import { comprasApi } from '../operaciones.api'
import type { PaginaPercepciones, PercepcionRegistro } from '../operaciones.types'

const props = defineProps<{ idSucursal: number | null; version: number }>()
const emit = defineEmits<{ verCompra: [idCompra: number] }>()
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const inicioMes = () => `${hoy().slice(0, 7)}-01`
const filtros = reactive({ desde: inicioMes(), hasta: hoy(), buscar: '' as string | null })
const aplicados = reactive({ desde: filtros.desde, hasta: filtros.hasta, buscar: '' })
const pagina = ref(1), limite = 20, total = ref(0), items = ref<PercepcionRegistro[]>([])
const resumen = ref<PaginaPercepciones['resumen']>({ montoTotal: '0.00', numeroPercepciones: 0, numeroCompras: 0 })
const loading = ref(false), error = ref('')
let solicitud = 0
const fecha = (value: string) => new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', dateStyle: 'short' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
const money = (value: string) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value))
const porcentaje = (value: string) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 }).format(Number(value))
const comprobante = (item: PercepcionRegistro) => item.compra.comprobante ? `${item.compra.comprobante.serie}-${item.compra.comprobante.numero}` : 'Sin comprobante'
const periodo = computed(() => aplicados.desde && aplicados.hasta ? `Del ${fecha(aplicados.desde)} al ${fecha(aplicados.hasta)}` : aplicados.desde ? `Desde ${fecha(aplicados.desde)}` : aplicados.hasta ? `Hasta ${fecha(aplicados.hasta)}` : 'Todo el historial')

async function load() {
  const actual = ++solicitud, idSucursal = props.idSucursal
  items.value = []; total.value = 0
  resumen.value = { montoTotal: '0.00', numeroPercepciones: 0, numeroCompras: 0 }
  error.value = ''; loading.value = false
  if (!idSucursal) { error.value = 'Selecciona una sucursal para consultar las percepciones.'; return }
  loading.value = true
  try {
    const { data } = await comprasApi.percepciones({ idSucursal, pagina: pagina.value, limite, desde: aplicados.desde || undefined, hasta: aplicados.hasta || undefined, buscar: aplicados.buscar || undefined })
    if (actual !== solicitud) return
    // Una actualización puede reducir el número de páginas disponibles.
    const ultimaPagina = Math.max(1, Math.ceil(data.total / limite))
    if (pagina.value > ultimaPagina) { pagina.value = ultimaPagina; return }
    items.value = data.data; total.value = data.total; resumen.value = data.resumen
  } catch (cause) {
    if (actual === solicitud) error.value = getApiErrorMessage(cause, 'No se pudieron cargar las percepciones')
  } finally { if (actual === solicitud) loading.value = false }
}

function buscar() {
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    ++solicitud; loading.value = false
    error.value = 'La fecha final no puede ser anterior a la fecha inicial.'
    return
  }
  Object.assign(aplicados, { desde: filtros.desde, hasta: filtros.hasta, buscar: filtros.buscar?.trim() || '' })
  if (pagina.value !== 1) pagina.value = 1
  else void load()
}
function esteMes() { Object.assign(filtros, { desde: inicioMes(), hasta: hoy() }); buscar() }
function todoElHistorial() { Object.assign(filtros, { desde: '', hasta: '', buscar: '' }); buscar() }
watch([() => props.idSucursal, () => props.version], () => {
  if (pagina.value !== 1) pagina.value = 1
  else void load()
}, { immediate: true })
watch(pagina, () => void load())
useRealtimeRefresh(['compras'], load, change => change.idSucursal === props.idSucursal)
onBeforeUnmount(() => { ++solicitud })
</script>
