<template>
  <div class="report-page">
    <div class="report-heading">
      <div class="d-flex align-center ga-3">
        <v-avatar
          color="primary"
          variant="tonal"
          rounded="lg"
          size="48"
        >
          <v-icon
            :icon="activeReport.icon"
            size="28"
          />
        </v-avatar>
        <div>
          <h1 class="text-h5 font-weight-bold">{{ activeReport.title }}</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">{{ activeReport.subtitle }}</p>
        </div>
      </div>
      <div class="report-export-actions">
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-receipt-text-outline"
          :loading="exporting === 'ticket'"
          :disabled="!result || loading || !!exporting || !!error"
          @click="exportFile('ticket')"
        >
          Ticket
        </v-btn>
        <v-btn
          color="success"
          variant="tonal"
          prepend-icon="mdi-microsoft-excel"
          :loading="exporting === 'excel'"
          :disabled="!result || loading || !!exporting || !!error"
          @click="exportFile('excel')"
        >
          Excel
        </v-btn>
        <v-btn
          color="error"
          variant="tonal"
          prepend-icon="mdi-file-pdf-box"
          :loading="exporting === 'pdf'"
          :disabled="!result || loading || !!exporting || !!error"
          @click="exportFile('pdf')"
        >
          PDF A4
        </v-btn>
      </div>
    </div>

    <v-card
      border
      elevation="0"
      rounded="xl"
      class="mb-5 overflow-hidden"
    >
      <v-card-text class="pa-5">
        <v-row align="center">
          <v-col
            cols="12"
            :md="activeReport.period ? 4 : 6"
          >
            <v-select
              v-model="filters.idSucursal"
              :items="branchOptions"
              item-title="title"
              item-value="value"
              label="Sucursal"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <template v-if="activeReport.period">
            <v-col
              cols="6"
              md="3"
            >
              <v-text-field
                v-model="filters.desde"
                type="date"
                label="Desde"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col
              cols="6"
              md="3"
            >
              <v-text-field
                v-model="filters.hasta"
                type="date"
                label="Hasta"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
          </template>
          <v-col
            v-else
            cols="12"
            md="4"
          >
            <v-select
              v-model="filters.estado"
              :items="stateOptions"
              label="Estado"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col
            cols="12"
            md="2"
          >
            <v-btn
              block
              height="48"
              color="primary"
              prepend-icon="mdi-magnify"
              :loading="loading"
              @click="search"
            >
              Consultar
            </v-btn>
          </v-col>
          <v-col
            v-if="activeType !== 'caja'"
            cols="12"
            :md="activeReport.period ? 8 : 12"
          >
            <v-text-field
              v-model="filters.buscar"
              :label="searchLabel"
              prepend-inner-icon="mdi-magnify"
              clearable
              variant="outlined"
              density="comfortable"
              hide-details
              maxlength="100"
              @keyup.enter="search"
            />
          </v-col>
          <v-col
            v-if="activeReport.period"
            cols="12"
            :md="activeType === 'caja' ? 12 : 4"
          >
            <div class="report-presets">
              <v-btn
                size="small"
                variant="tonal"
                @click="setPeriod('today')"
              >
                Hoy
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="setPeriod('week')"
              >
                Últimos 7 días
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="setPeriod('month')"
              >
                Este mes
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-5"
      closable
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>
    <template v-if="result">
      <v-row class="mb-2">
        <v-col
          v-for="metric in result.resumen"
          :key="metric.titulo"
          cols="6"
          :lg="result.resumen.length <= 2 ? 6 : 3"
        >
          <v-card
            border
            elevation="0"
            rounded="xl"
            class="report-metric"
          >
            <v-card-text class="pa-5">
              <div class="text-body-2 text-medium-emphasis">{{ metric.titulo }}</div>
              <div class="report-metric-value mt-3">
                {{ metric.formato === 'dinero' ? money(metric.valor) : metric.valor }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <p class="report-description text-body-2 text-medium-emphasis mb-5">
        {{ result.descripcion }}
      </p>

      <v-card
        v-if="activeType === 'productos' && page === 1 && result.data.length"
        border
        elevation="0"
        rounded="xl"
        class="mb-5"
      >
        <v-card-text class="pa-5">
          <h2 class="text-subtitle-1 font-weight-bold mb-4">Productos con mayor importe vendido</h2>
          <div
            v-for="(row, index) in result.data.slice(0, 5)"
            :key="String(row.id)"
            class="report-ranking-row"
          >
            <span class="text-body-2">{{ index + 1 }}. {{ row.producto }}</span>
            <strong>{{ money(row.importe) }}</strong>
            <v-progress-linear
              :model-value="
                Number(result.data[0]?.importe) > 0
                  ? (Number(row.importe) / Number(result.data[0]?.importe)) * 100
                  : 0
              "
              height="7"
              rounded
              color="primary"
              class="mt-2"
            />
          </div>
        </v-card-text>
      </v-card>

      <v-card
        border
        elevation="0"
        rounded="xl"
        class="overflow-hidden"
        :aria-busy="loading"
      >
        <div class="report-result-meta pa-5">
          <div>
            <strong>{{ result.sucursal }}</strong>
            <div class="text-caption text-medium-emphasis mt-1">
              {{
                result.periodo
                  ? `${displayDate(result.desde)} al ${displayDate(result.hasta)}`
                  : 'Estado actual'
              }}
              · {{ result.total }} registros
            </div>
            <div
              v-if="result.filtros"
              class="text-caption text-medium-emphasis mt-1"
            >
              {{ result.filtros }}
            </div>
          </div>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            color="primary"
            aria-label="Actualizar reporte"
            :loading="loading"
            @click="load"
          />
        </div>
        <v-divider />
        <div
          v-if="loading"
          class="text-center pa-12"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
          <div class="text-body-2 mt-4">Actualizando reporte…</div>
        </div>
        <template v-else-if="result.data.length">
          <v-table
            class="report-desktop-table"
            hover
          >
            <thead>
              <tr>
                <th
                  v-for="column in result.columnas"
                  :key="column.key"
                  :class="{ 'text-end': isNumeric(column) }"
                >
                  {{ column.titulo }}
                </th>
                <th v-if="activeType === 'ventas'" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in result.data"
                :key="String(row.id ?? row.dia ?? index)"
              >
                <td
                  v-for="column in result.columnas"
                  :key="column.key"
                  :class="{ 'text-end report-number': isNumeric(column) }"
                >
                  <v-chip
                    v-if="column.formato === 'estado'"
                    :color="stateColor(row[column.key])"
                    variant="tonal"
                    size="small"
                  >
                    {{ row[column.key] }}
                  </v-chip>
                  <template v-else>{{ formatValue(row[column.key], column) }}</template>
                </td>
                <td v-if="activeType === 'ventas'">
                  <v-btn
                    icon="mdi-printer-outline"
                    variant="text"
                    color="primary"
                    aria-label="Ver ticket"
                    @click="printTicket(Number(row.id))"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
          <div class="report-mobile-cards pa-4">
            <v-card
              v-for="(row, index) in result.data"
              :key="String(row.id ?? row.dia ?? index)"
              border
              elevation="0"
              rounded="lg"
              class="mb-4"
            >
              <v-card-text class="pa-4">
                <div class="font-weight-bold text-body-1 mb-4">{{ row[primaryKey] }}</div>
                <dl>
                  <template
                    v-for="column in result.columnas.filter((c) => c.key !== primaryKey)"
                    :key="column.key"
                  >
                    <dt>{{ column.titulo }}</dt>
                    <dd>
                      <v-chip
                        v-if="column.formato === 'estado'"
                        :color="stateColor(row[column.key])"
                        variant="tonal"
                        size="small"
                      >
                        {{ row[column.key] }}
                      </v-chip>
                      <template v-else>{{ formatValue(row[column.key], column) }}</template>
                    </dd>
                  </template>
                </dl>
                <v-btn
                  v-if="activeType === 'ventas'"
                  class="mt-4"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-printer-outline"
                  @click="printTicket(Number(row.id))"
                >
                  Ver ticket
                </v-btn>
              </v-card-text>
            </v-card>
          </div>
        </template>
        <div
          v-else
          class="text-center text-medium-emphasis pa-12"
        >
          <v-icon
            size="48"
            icon="mdi-chart-box-outline"
          />
          <div class="mt-4">No hay registros para los filtros seleccionados.</div>
        </div>
        <v-divider />
        <div class="report-pagination pa-4">
          <span class="text-caption text-medium-emphasis">
            {{
              result.total
                ? `${(page - 1) * limit + 1}–${Math.min(page * limit, result.total)} de ${result.total}`
                : '0 registros'
            }}
          </span>
          <v-pagination
            v-if="result.total > limit"
            v-model="page"
            :length="Math.ceil(result.total / limit)"
            :total-visible="3"
            size="small"
          />
        </div>
      </v-card>
    </template>
    <div
      v-else-if="loading"
      class="text-center py-12"
    >
      <v-progress-circular
        indeterminate
        color="primary"
      />
      <p class="mt-4">Consultando reporte…</p>
    </div>
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { isAxiosError } from 'axios';
import { getApiErrorMessage } from '@/core/api/api-error';
import { useRealtimeRefresh } from '@/core/realtime/useRealtimeRefresh';
import { useSucursalStore } from '@/shared/stores/sucursal.store';
import { abrirTicketVenta } from '@/modules/operaciones/venta-ticket';
import {
  reportesApi,
  type FormatoReporte,
  type ResultadoReporte,
  type ColumnaReporte,
  type ConsultaReporte,
} from '../reportes.api';
import { reportesConfig } from '../reportes.config';

const branch = useSucursalStore(),
  route = useRoute();
const activeReport = ref(reportesConfig.find((report) => report.type === route.meta.reportType)!);
watch(
  () => route.meta.reportType,
  (type) => {
    const report = reportesConfig.find((report) => report.type === type);
    if (report) activeReport.value = report;
  },
);
const activeType = computed(() => activeReport.value.type);
const primaryKey = computed(
  () =>
    ({
      ventas: 'numero',
      productos: 'producto',
      compras: 'proveedor',
      caja: 'fecha',
      inventario: 'producto',
      deudas: 'cliente',
    })[activeType.value],
);
function today() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)!.value).join('-');
}
const todayDate = today();
const filters = reactive({
  idSucursal: branch.idSucursalActual as number | null,
  desde: todayDate.slice(0, 8) + '01',
  hasta: todayDate,
  buscar: '',
  estado: 'todos',
});
const branchOptions = computed(() => [
  { title: 'Todas mis sucursales', value: null },
  ...branch.sucursales.map((b) => ({ title: b.nombre, value: b.idSucursal })),
]);
const stateOptions = computed(() =>
  activeType.value === 'inventario'
    ? [
        { title: 'Todos', value: 'todos' },
        { title: 'Stock bajo o agotado', value: 'critico' },
        { title: 'Sin stock', value: 'agotado' },
      ]
    : [
        { title: 'Todos', value: 'todos' },
        { title: 'Con saldo pendiente', value: 'pendiente' },
        { title: 'Vencidas', value: 'vencida' },
        { title: 'Pagadas', value: 'pagada' },
      ],
);
const searchLabel = computed(() =>
  activeType.value === 'compras'
    ? 'Buscar proveedor'
    : activeType.value === 'deudas'
      ? 'Buscar cliente o documento'
      : activeType.value === 'ventas'
        ? 'Buscar cliente, venta o comentario'
        : 'Buscar producto o categoría',
);
const result = ref<ResultadoReporte | null>(null),
  error = ref(''),
  loading = ref(false),
  page = ref(1),
  limit = 25;
const exporting = ref<FormatoReporte | null>(null),
  applied = ref<ConsultaReporte>({});
const snackbar = reactive({ show: false, message: '', color: 'error' });
let requestId = 0;

function currentParams(): ConsultaReporte {
  return {
    ...(filters.idSucursal ? { idSucursal: filters.idSucursal } : {}),
    ...(activeReport.value.period ? { desde: filters.desde, hasta: filters.hasta } : {}),
    buscar: activeType.value === 'caja' ? undefined : filters.buscar?.trim() || undefined,
    estado: filters.estado,
  };
}
async function load() {
  const request = ++requestId,
    type = activeType.value,
    params = { ...applied.value, pagina: page.value, limite: limit };
  loading.value = true;
  error.value = '';
  try {
    const { data } = await reportesApi.obtener(type, params);
    if (request !== requestId || type !== activeType.value) return;
    result.value = data;
  } catch (cause) {
    if (request === requestId) {
      result.value = null;
      error.value = getApiErrorMessage(cause, 'No se pudo cargar el reporte.');
    }
  } finally {
    if (request === requestId) loading.value = false;
  }
}
function search() {
  if (
    activeReport.value.period &&
    (!filters.desde || !filters.hasta || filters.desde > filters.hasta)
  ) {
    error.value = 'Selecciona un periodo válido con fecha de inicio y fin.';
    return;
  }
  applied.value = currentParams();
  if (page.value !== 1) page.value = 1;
  else void load();
}
function setPeriod(preset: 'today' | 'week' | 'month') {
  filters.hasta = today();
  filters.desde =
    preset === 'today'
      ? filters.hasta
      : preset === 'month'
        ? filters.hasta.slice(0, 8) + '01'
        : new Date(Date.parse(filters.hasta + 'T12:00:00Z') - 6 * 86400000)
            .toISOString()
            .slice(0, 10);
  search();
}
function money(value: unknown) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
    Number(value) || 0,
  );
}
function displayDate(value: string | null) {
  return value?.split('-').reverse().join('/') ?? '';
}
function isNumeric(column: ColumnaReporte) {
  return ['dinero', 'cantidad', 'numero'].includes(column.formato);
}
function formatValue(value: string | number | null | undefined, column: ColumnaReporte) {
  if (value === null || value === undefined || value === '') return '—';
  return column.formato === 'dinero'
    ? money(value)
    : column.formato === 'cantidad'
      ? Number(value).toLocaleString('es-PE', { maximumFractionDigits: 3 })
      : String(value);
}
function stateColor(value: unknown) {
  return ['Agotado', 'Vencida'].includes(String(value))
    ? 'error'
    : ['Stock bajo', 'Pendiente'].includes(String(value))
      ? 'warning'
      : 'success';
}
function printTicket(id: number) {
  if (!abrirTicketVenta(id))
    Object.assign(snackbar, {
      show: true,
      color: 'warning',
      message: 'Permite las ventanas emergentes para abrir el ticket.',
    });
}
async function exportFile(format: FormatoReporte) {
  if (!result.value || loading.value || exporting.value) return;
  const type = activeType.value;
  exporting.value = format;
  try {
    const { data } = await reportesApi.exportar(type, format, applied.value);
    const url = URL.createObjectURL(data),
      link = document.createElement('a');
    link.href = url;
    link.download = `reporte-${type}-${format}-${today()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Object.assign(snackbar, {
      show: true,
      color: 'success',
      message: 'Reporte exportado con todos los registros de la consulta.',
    });
  } catch (cause) {
    let message = getApiErrorMessage(cause, 'No se pudo exportar el reporte.');
    if (isAxiosError(cause) && cause.response?.data instanceof Blob) {
      try {
        const details = JSON.parse(await cause.response.data.text());
        if (typeof details.message === 'string') message = details.message;
      } catch {
        /* Conserva el mensaje general. */
      }
    }
    Object.assign(snackbar, { show: true, color: 'error', message });
  } finally {
    exporting.value = null;
  }
}
watch(page, () => void load());
watch(
  activeType,
  () => {
    result.value = null;
    filters.buscar = '';
    filters.estado = activeType.value === 'deudas' ? 'pendiente' : 'todos';
    search();
  },
  { immediate: true },
);
watch(
  () => branch.idSucursalActual,
  (value) => {
    filters.idSucursal = value;
    result.value = null;
    search();
  },
);
useRealtimeRefresh(
  ['ventas', 'ingresos', 'egresos', 'compras', 'deudas', 'stock', 'clientes'],
  async () => {
    if (result.value) await load();
  },
  (change) => !applied.value.idSucursal || change.idSucursal === applied.value.idSucursal,
);
onBeforeUnmount(() => {
  requestId++;
});
</script>

<style scoped>
.report-page {
  max-width: 1800px;
  margin: 0 auto;
  padding-bottom: 24px;
}
.report-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
.report-export-actions,
.report-presets {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.report-presets {
  justify-content: flex-end;
}
.report-metric {
  height: 100%;
}
.report-metric-value {
  font-size: clamp(1.1rem, 2vw, 1.65rem);
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}
.report-description {
  line-height: 1.7;
  max-width: 1050px;
}
.report-result-meta,
.report-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.report-desktop-table :deep(td),
.report-desktop-table :deep(th) {
  padding: 15px 18px;
}
.report-number {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.report-mobile-cards {
  display: none;
}
.report-mobile-cards dl {
  display: grid;
  grid-template-columns: minmax(100px, 0.9fr) minmax(0, 1.1fr);
  gap: 12px;
  font-size: 0.85rem;
}
.report-mobile-cards dt {
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.report-mobile-cards dd {
  margin: 0;
  text-align: right;
  overflow-wrap: anywhere;
}
.report-ranking-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 20px;
  margin-bottom: 20px;
}
.report-ranking-row:last-child {
  margin-bottom: 0;
}
.report-ranking-row :deep(.v-progress-linear) {
  grid-column: 1 / -1;
}
@media (max-width: 959px) {
  .report-desktop-table {
    display: none;
  }
  .report-mobile-cards {
    display: block;
  }
}
@media (max-width: 599px) {
  .report-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }
  .report-heading h1 {
    font-size: 1.35rem !important;
  }
  .report-export-actions {
    width: 100%;
  }
  .report-export-actions .v-btn {
    flex: 1;
  }
  .report-presets {
    justify-content: flex-start;
  }
  .report-pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
  .report-ranking-row {
    font-size: 0.8rem;
    column-gap: 12px;
  }
}
</style>
