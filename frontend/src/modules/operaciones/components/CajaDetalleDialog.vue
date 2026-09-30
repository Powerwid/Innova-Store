<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="mobile"
    max-width="1280"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-xl overflow-hidden">
      <v-card-title class="d-flex align-center ga-3 pa-5 border-b">
        <v-avatar color="primary" variant="tonal" rounded="lg">
          <v-icon>mdi-file-document-outline</v-icon>
        </v-avatar>

        <div>
          <div>Detalle de caja #{{ displayedCash?.idCaja }}</div>
          <div class="text-caption text-medium-emphasis font-weight-regular">
            {{ displayedCash?.sucursal.nombre || 'Sucursal' }} ·
            {{ formatDate(displayedCash?.fechaApertura) }}
          </div>
        </div>

        <v-spacer />

        <v-chip :color="isOpen ? 'primary' : 'success'" variant="tonal">
          {{ isOpen ? 'Abierta' : 'Cerrada' }}
        </v-chip>

        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-tabs
        v-model="tab"
        color="primary"
        class="border-b"
        show-arrows
      >
        <v-tab value="summary">
          <v-icon start>mdi-chart-box-outline</v-icon>
          Resumen
        </v-tab>
        <v-tab value="sales">
          <v-icon start>mdi-receipt-text-outline</v-icon>
          Ventas
        </v-tab>
        <v-tab value="incomes">
          <v-icon start>mdi-cash-plus</v-icon>
          Ingresos
        </v-tab>
        <v-tab value="expenses">
          <v-icon start>mdi-cash-minus</v-icon>
          Egresos
        </v-tab>
        <v-tab value="purchases">
          <v-icon start>mdi-cart-arrow-down</v-icon>
          Compras
        </v-tab>
      </v-tabs>

      <v-card-text class="pa-5 detail-content">
        <div v-if="initialLoading" class="text-center py-16">
          <v-progress-circular indeterminate color="primary" size="48" />
          <div class="text-body-2 text-medium-emphasis mt-3">
            Cargando detalle de caja...
          </div>
        </div>

        <v-alert v-else-if="error" color="error" variant="tonal">
          {{ error }}
        </v-alert>

        <v-window v-else v-model="tab">
          <v-window-item value="summary">
            <v-row density="compact">
              <v-col
                v-for="metric in summaryMetrics"
                :key="metric.label"
                cols="6"
                md="4"
                lg="2"
              >
                <div class="metric-card pa-4 rounded-lg h-100">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-caption text-medium-emphasis">
                      {{ metric.label }}
                    </span>
                    <v-icon :color="metric.color" size="20">
                      {{ metric.icon }}
                    </v-icon>
                  </div>

                  <div class="text-h6 font-weight-bold">
                    S/ {{ formatMoney(metric.value) }}
                  </div>

                  <div
                    v-if="metric.count !== undefined"
                    class="text-caption text-medium-emphasis mt-1"
                  >
                    {{ metric.count }} registros
                  </div>
                </div>
              </v-col>
            </v-row>

            <v-row class="mt-2" density="compact">
              <v-col cols="12" md="6">
                <div class="total-card pa-5 rounded-lg h-100">
                  <div class="text-caption text-medium-emphasis">
                    Saldo total calculado
                  </div>
                  <div class="text-h4 font-weight-bold mt-1">
                    S/ {{ formatMoney(totalCalculated) }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mt-2">
                    Apertura + ventas + ingresos − egresos − compras
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="6">
                <div class="cash-card pa-5 rounded-lg h-100">
                  <div class="text-caption text-medium-emphasis">
                    Efectivo esperado en caja
                  </div>
                  <div class="text-h4 font-weight-bold mt-1">
                    S/ {{ formatMoney(expectedCash) }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mt-2">
                    Incluye la apertura y solo los movimientos en efectivo.
                  </div>
                </div>
              </v-col>
            </v-row>

            <div class="text-subtitle-1 font-weight-bold mt-6 mb-3">
              Movimientos por medio de pago
            </div>

            <v-table class="rounded-lg border" density="comfortable">
              <thead>
                <tr class="bg-primary">
                  <th class="text-white">Medio de pago</th>
                  <th class="text-white text-end">Ventas</th>
                  <th class="text-white text-end">Ingresos</th>
                  <th class="text-white text-end">Egresos</th>
                  <th class="text-white text-end">Compras</th>
                  <th class="text-white text-end">Neto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="method in paymentSummaries" :key="method.idMedioPago">
                  <td class="font-weight-medium">{{ method.nombre }}</td>
                  <td class="text-end">S/ {{ formatMoney(method.ventas) }}</td>
                  <td class="text-end text-success">
                    S/ {{ formatMoney(method.ingresos) }}
                  </td>
                  <td class="text-end text-error">
                    S/ {{ formatMoney(method.egresos) }}
                  </td>
                  <td class="text-end text-error">
                    S/ {{ formatMoney(method.compras) }}
                  </td>
                  <td class="text-end font-weight-bold">
                    S/ {{ formatMoney(method.neto) }}
                  </td>
                </tr>

                <tr v-if="!paymentSummaries.length">
                  <td colspan="6" class="text-center text-medium-emphasis py-8">
                    No hay movimientos por medio de pago.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <v-window-item value="sales">
            <div class="d-flex flex-wrap align-center ga-3 mb-5">
              <div>
                <div class="text-h6 font-weight-bold">Detalle de ventas</div>
                <div class="text-body-2 text-medium-emphasis">
                  Pagos y productos vendidos durante esta caja.
                </div>
              </div>
            </div>

            <div v-if="loading.sales" class="loading-state">
              <v-progress-circular indeterminate color="primary" />
            </div>

            <div v-else-if="sales.length === 0" class="empty-state">
              No hay ventas asociadas a esta caja.
            </div>

            <v-expansion-panels v-else variant="accordion">
              <v-expansion-panel
                v-for="sale in paginatedSales"
                :key="sale.idIngreso"
              >
                <v-expansion-panel-title>
                  <div class="d-flex flex-wrap align-center ga-3 w-100 pe-4">
                    <div>
                      <div class="font-weight-bold">
                        Venta #{{ sale.idIngreso }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatDate(sale.fechaIngreso) }} ·
                        {{ sale.deudaOriginada?.cliente.nombre || 'Cliente general' }}
                      </div>
                    </div>

                    <v-spacer />

                    <v-chip color="success" variant="tonal" size="small">
                      Registrada
                    </v-chip>

                    <span class="font-weight-bold">
                      S/ {{ formatMoney(sale.monto) }}
                    </span>
                  </div>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                  <div class="text-subtitle-2 font-weight-bold mb-2">Pagos</div>

                  <v-chip
                    v-for="payment in sale.pagos"
                    :key="payment.idMedioPago"
                    class="me-2 mb-3"
                    variant="tonal"
                    color="primary"
                  >
                    {{ payment.medioPago.nombre }}:
                    S/ {{ formatMoney(payment.monto) }}
                  </v-chip>

                  <span
                    v-if="!sale.pagos.length"
                    class="text-body-2 text-medium-emphasis"
                  >
                    Venta registrada a crédito.
                  </span>

                  <div class="text-subtitle-2 font-weight-bold my-2">
                    Productos vendidos
                  </div>

                  <v-table density="compact" class="border rounded-lg">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th class="text-end">Cantidad</th>
                        <th class="text-end">P. unitario</th>
                        <th class="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="product in sale.productos"
                        :key="`${sale.idIngreso}-${product.idProductoSucursal}-${product.idAlmacen}`"
                      >
                        <td>{{ product.productoSucursal.producto.nombre }}</td>
                        <td class="text-end">
                          {{ formatQuantity(product.cantidad) }}
                        </td>
                        <td class="text-end">
                          S/ {{ formatMoney(product.precioUnitario) }}
                        </td>
                        <td class="text-end font-weight-medium">
                          S/ {{ formatMoney(lineTotal(product.cantidad, product.precioUnitario)) }}
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <v-pagination
              v-if="pagination.sales.lastPage > 1"
              v-model="pagination.sales.currentPage"
              :length="pagination.sales.lastPage"
              class="mt-4"
            />
          </v-window-item>

          <v-window-item value="incomes">
            <div class="d-flex flex-wrap align-center ga-3 mb-5">
              <div>
                <div class="text-h6 font-weight-bold">Ingresos manuales</div>
                <div class="text-body-2 text-medium-emphasis">
                  Entradas de dinero distintas a las ventas.
                </div>
              </div>

              <v-spacer />

              <v-btn
                v-if="isOpen"
                color="primary"
                prepend-icon="mdi-plus"
                @click="showPending('El registro de ingresos desde este modal')"
              >
                Registrar ingreso
              </v-btn>
            </div>

            <div v-if="loading.incomes" class="loading-state">
              <v-progress-circular indeterminate color="primary" />
            </div>

            <div v-else-if="incomes.length === 0" class="empty-state">
              No hay ingresos manuales en esta caja.
            </div>

            <v-table v-else class="rounded-lg border" density="comfortable">
              <thead>
                <tr class="bg-primary">
                  <th class="text-white">Fecha</th>
                  <th class="text-white">Motivo</th>
                  <th class="text-white">Detalle</th>
                  <th class="text-white">Medio de pago</th>
                  <th class="text-white">Usuario</th>
                  <th class="text-white text-end">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in paginatedIncomes" :key="item.idIngreso">
                  <td>{{ formatDate(item.fechaIngreso) }}</td>
                  <td>{{ item.motivoIngreso.motivo }}</td>
                  <td>{{ item.detalle || '—' }}</td>
                  <td>{{ paymentNames(item.pagos) }}</td>
                  <td>{{ userName(item.usuario) }}</td>
                  <td class="text-end font-weight-bold text-success">
                    + S/ {{ formatMoney(item.monto) }}
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-pagination
              v-if="pagination.incomes.lastPage > 1"
              v-model="pagination.incomes.currentPage"
              :length="pagination.incomes.lastPage"
              class="mt-4"
            />
          </v-window-item>

          <v-window-item value="expenses">
            <div class="d-flex flex-wrap align-center ga-3 mb-5">
              <div>
                <div class="text-h6 font-weight-bold">Egresos manuales</div>
                <div class="text-body-2 text-medium-emphasis">
                  Salidas de dinero distintas a las compras.
                </div>
              </div>

              <v-spacer />

              <v-btn
                v-if="isOpen"
                color="error"
                variant="tonal"
                prepend-icon="mdi-plus"
                @click="showPending('El registro de egresos desde este modal')"
              >
                Registrar egreso
              </v-btn>
            </div>

            <div v-if="loading.expenses" class="loading-state">
              <v-progress-circular indeterminate color="primary" />
            </div>

            <div v-else-if="expenses.length === 0" class="empty-state">
              No hay egresos manuales en esta caja.
            </div>

            <v-table v-else class="rounded-lg border" density="comfortable">
              <thead>
                <tr class="bg-primary">
                  <th class="text-white">Fecha</th>
                  <th class="text-white">Motivo</th>
                  <th class="text-white">Detalle</th>
                  <th class="text-white">Medio de pago</th>
                  <th class="text-white">Usuario</th>
                  <th class="text-white text-end">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in paginatedExpenses" :key="item.idEgreso">
                  <td>{{ formatDate(item.fechaEgreso) }}</td>
                  <td>{{ item.motivoEgreso.motivo }}</td>
                  <td>{{ item.detalle || '—' }}</td>
                  <td>{{ paymentNames(item.pagos) }}</td>
                  <td>{{ userName(item.usuario) }}</td>
                  <td class="text-end font-weight-bold text-error">
                    − S/ {{ formatMoney(item.monto) }}
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-pagination
              v-if="pagination.expenses.lastPage > 1"
              v-model="pagination.expenses.currentPage"
              :length="pagination.expenses.lastPage"
              class="mt-4"
            />
          </v-window-item>

          <v-window-item value="purchases">
            <div class="d-flex flex-wrap align-center ga-3 mb-5">
              <div>
                <div class="text-h6 font-weight-bold">Compras</div>
                <div class="text-body-2 text-medium-emphasis">
                  Compras descontadas de esta caja y agregadas al inventario.
                </div>
              </div>

              <v-spacer />

              <v-btn
                v-if="isOpen"
                color="primary"
                prepend-icon="mdi-plus"
                @click="showPending('El registro de compras desde este modal')"
              >
                Registrar compra
              </v-btn>
            </div>

            <div v-if="loading.purchases" class="loading-state">
              <v-progress-circular indeterminate color="primary" />
            </div>

            <div v-else-if="purchases.length === 0" class="empty-state">
              No hay compras asociadas a esta caja.
            </div>

            <v-expansion-panels v-else variant="accordion">
              <v-expansion-panel
                v-for="purchase in paginatedPurchases"
                :key="purchase.idCompra"
              >
                <v-expansion-panel-title>
                  <div class="d-flex flex-wrap align-center ga-3 w-100 pe-4">
                    <div>
                      <div class="font-weight-bold">
                        Compra #{{ purchase.idCompra }} · {{ purchase.nombreProveedor }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatDate(purchase.fechaCompra) }} ·
                        {{ purchasePaymentNames(purchase) }}
                      </div>
                    </div>

                    <v-spacer />

                    <span class="font-weight-bold text-error">
                      − S/ {{ formatMoney(purchaseCashAmount(purchase)) }}
                    </span>
                  </div>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                  <div class="text-body-2 mb-3">
                    Comprobante:
                    {{ purchase.comprobante
                      ? `${purchase.comprobante.serie}-${purchase.comprobante.numero}`
                      : '—' }}
                  </div>

                  <v-table density="compact" class="border rounded-lg">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th class="text-end">Cantidad</th>
                        <th class="text-end">P. unitario</th>
                        <th class="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in purchase.detalles"
                        :key="item.idCompraDetalle"
                      >
                        <td>{{ item.productoSucursal.producto.nombre }}</td>
                        <td class="text-end">
                          {{ formatQuantity(item.cantidad) }}
                        </td>
                        <td class="text-end">
                          S/ {{ formatMoney(item.precioUnitario) }}
                        </td>
                        <td class="text-end font-weight-medium">
                          S/ {{ formatMoney(lineTotal(item.cantidad, item.precioUnitario)) }}
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <v-pagination
              v-if="pagination.purchases.lastPage > 1"
              v-model="pagination.purchases.currentPage"
              :length="pagination.purchases.lastPage"
              class="mt-4"
            />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">
    {{ snackbar.message }}
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { getApiErrorMessage } from '@/core/api/api-error'
import {
  cajasApi,
  comprasApi,
  egresosApi,
  ingresosApi,
  ventasApi,
} from '../operaciones.api'
import type {
  Caja,
  Compra,
  Egreso,
  Ingreso,
  Pago,
  UsuarioResumen,
} from '../operaciones.types'

type DetailTab = 'summary' | 'sales' | 'incomes' | 'expenses' | 'purchases'
type CollectionName = Exclude<DetailTab, 'summary'>

interface PaginationState {
  currentPage: number
  lastPage: number
  perPage: number
}

interface PaymentSummary {
  idMedioPago: number
  nombre: string
  ventas: number
  ingresos: number
  egresos: number
  compras: number
  neto: number
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    caja: Caja | null
    branchId?: number | null
    initialTab?: DetailTab
  }>(),
  {
    branchId: null,
    initialTab: 'summary',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { mobile } = useDisplay()

const tab = ref<DetailTab>('summary')
const cashDetail = ref<Caja | null>(null)

const sales = ref<Ingreso[]>([])
const incomes = ref<Ingreso[]>([])
const expenses = ref<Egreso[]>([])
const purchases = ref<Compra[]>([])

const initialLoading = ref(false)
const error = ref('')

const loading = reactive<Record<CollectionName, boolean>>({
  sales: false,
  incomes: false,
  expenses: false,
  purchases: false,
})

const pagination = reactive<Record<CollectionName, PaginationState>>({
  sales: pageState(),
  incomes: pageState(),
  expenses: pageState(),
  purchases: pageState(),
})

const snackbar = reactive({
  show: false,
  message: '',
  color: 'info',
})

const displayedCash = computed(() => cashDetail.value ?? props.caja)
const isOpen = computed(() => Boolean(displayedCash.value && !displayedCash.value.fechaCierre))

const salesTotal = computed(() => sumAmounts(sales.value))
const incomesTotal = computed(() => sumAmounts(incomes.value))
const expensesTotal = computed(() => sumAmounts(expenses.value))
const purchasesTotal = computed(() => {
  return purchases.value.reduce(
    (total, purchase) => total + purchaseCashAmount(purchase),
    0,
  )
})

const totalCalculated = computed(() => {
  const opening = Number(displayedCash.value?.montoApertura ?? 0)

  return opening
    + salesTotal.value
    + incomesTotal.value
    - expensesTotal.value
    - purchasesTotal.value
})

const expectedCash = computed(() => {
  const cashBalance = displayedCash.value?.detalles.find((detail) => {
    return detail.medioPago.nombre.toLowerCase().includes('efectivo')
  })

  return Number(cashBalance?.monto ?? 0)
})

const summaryMetrics = computed(() => [
  {
    label: 'Apertura',
    value: displayedCash.value?.montoApertura ?? 0,
    icon: 'mdi-lock-open-outline',
    color: 'primary',
  },
  {
    label: 'Ventas',
    value: salesTotal.value,
    count: sales.value.length,
    icon: 'mdi-receipt-text-outline',
    color: 'success',
  },
  {
    label: 'Ingresos',
    value: incomesTotal.value,
    count: incomes.value.length,
    icon: 'mdi-cash-plus',
    color: 'success',
  },
  {
    label: 'Egresos',
    value: expensesTotal.value,
    count: expenses.value.length,
    icon: 'mdi-cash-minus',
    color: 'error',
  },
  {
    label: 'Compras',
    value: purchasesTotal.value,
    count: purchases.value.length,
    icon: 'mdi-cart-arrow-down',
    color: 'error',
  },
  {
    label: 'Salidas totales',
    value: expensesTotal.value + purchasesTotal.value,
    icon: 'mdi-arrow-down-bold-circle-outline',
    color: 'error',
  },
])

const paymentSummaries = computed<PaymentSummary[]>(() => {
  const summaries = new Map<number, PaymentSummary>()

  for (const detail of displayedCash.value?.detalles ?? []) {
    ensurePaymentSummary(
      summaries,
      detail.idMedioPago,
      detail.medioPago.nombre,
    )
  }

  addPaymentsToSummary(summaries, sales.value, 'ventas')
  addPaymentsToSummary(summaries, incomes.value, 'ingresos')
  addPaymentsToSummary(summaries, expenses.value, 'egresos')

  for (const purchase of purchases.value) {
    for (const expense of purchase.egresos) {
      if (expense.idCaja !== displayedCash.value?.idCaja) continue
      addPaymentList(summaries, expense.pagos, 'compras')
    }
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      neto:
        summary.ventas
        + summary.ingresos
        - summary.egresos
        - summary.compras,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
})

const paginatedSales = computed(() => paginate(sales.value, pagination.sales))
const paginatedIncomes = computed(() => paginate(incomes.value, pagination.incomes))
const paginatedExpenses = computed(() => paginate(expenses.value, pagination.expenses))
const paginatedPurchases = computed(() => paginate(purchases.value, pagination.purchases))

function pageState(): PaginationState {
  return {
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
  }
}

async function loadDetail() {
  if (!props.caja?.idCaja) return

  initialLoading.value = true
  error.value = ''

  const cajaId = props.caja.idCaja
  const branchId = props.branchId ?? props.caja.idSucursal

  Object.keys(loading).forEach((key) => {
    loading[key as CollectionName] = true
  })

  try {
    const [cashResponse, salesResponse, incomesResponse, expensesResponse, purchasesResponse] =
      await Promise.all([
        cajasApi.obtener(cajaId),
        ventasApi.listar({ idCaja: cajaId, pagina: 1, limite: 100 }),
        ingresosApi.listar({ idCaja: cajaId, pagina: 1, limite: 100 }),
        egresosApi.listar({ idCaja: cajaId, pagina: 1, limite: 100 }),
        comprasApi.listar({ idSucursal: branchId, pagina: 1, limite: 100 }),
      ])

    cashDetail.value = cashResponse.data
    sales.value = salesResponse.data.data
    incomes.value = incomesResponse.data.data.filter((item) => {
      return !item.motivoIngreso.reservado
    })
    expenses.value = expensesResponse.data.data.filter((item) => {
      return !item.motivoEgreso.reservado
    })
    purchases.value = purchasesResponse.data.data.filter((purchase) => {
      return purchase.egresos.some((expense) => expense.idCaja === cajaId)
    })

    updatePagination()
  } catch (cause) {
    error.value = getApiErrorMessage(
      cause,
      'No se pudo cargar el detalle de caja.',
    )
  } finally {
    initialLoading.value = false

    Object.keys(loading).forEach((key) => {
      loading[key as CollectionName] = false
    })
  }
}

function resetState() {
  tab.value = props.initialTab
  cashDetail.value = null
  sales.value = []
  incomes.value = []
  expenses.value = []
  purchases.value = []
  error.value = ''

  for (const state of Object.values(pagination)) {
    Object.assign(state, pageState())
  }
}

function updatePagination() {
  updatePageState(pagination.sales, sales.value.length)
  updatePageState(pagination.incomes, incomes.value.length)
  updatePageState(pagination.expenses, expenses.value.length)
  updatePageState(pagination.purchases, purchases.value.length)
}

function updatePageState(state: PaginationState, total: number) {
  state.currentPage = 1
  state.lastPage = Math.max(1, Math.ceil(total / state.perPage))
}

function paginate<T>(items: T[], state: PaginationState) {
  const start = (state.currentPage - 1) * state.perPage
  return items.slice(start, start + state.perPage)
}

function ensurePaymentSummary(
  summaries: Map<number, PaymentSummary>,
  idMedioPago: number,
  nombre: string,
) {
  const existing = summaries.get(idMedioPago)
  if (existing) return existing

  const summary: PaymentSummary = {
    idMedioPago,
    nombre,
    ventas: 0,
    ingresos: 0,
    egresos: 0,
    compras: 0,
    neto: 0,
  }

  summaries.set(idMedioPago, summary)
  return summary
}

function addPaymentsToSummary(
  summaries: Map<number, PaymentSummary>,
  movements: Array<Ingreso | Egreso>,
  column: 'ventas' | 'ingresos' | 'egresos',
) {
  for (const movement of movements) {
    addPaymentList(summaries, movement.pagos, column)
  }
}

function addPaymentList(
  summaries: Map<number, PaymentSummary>,
  payments: Pago[],
  column: 'ventas' | 'ingresos' | 'egresos' | 'compras',
) {
  for (const payment of payments) {
    const summary = ensurePaymentSummary(
      summaries,
      payment.idMedioPago,
      payment.medioPago.nombre,
    )

    summary[column] += Number(payment.monto)
  }
}

function purchaseExpenses(purchase: Compra) {
  return purchase.egresos.filter((expense) => {
    return expense.idCaja === displayedCash.value?.idCaja
  })
}

function purchaseCashAmount(purchase: Compra) {
  return purchaseExpenses(purchase).reduce(
    (total, expense) => total + Number(expense.monto),
    0,
  )
}

function purchasePaymentNames(purchase: Compra) {
  const payments = purchaseExpenses(purchase).flatMap((expense) => expense.pagos)
  return paymentNames(payments)
}

function paymentNames(payments: Pago[]) {
  if (!payments.length) return 'Sin medio de pago'

  return [...new Set(payments.map((payment) => payment.medioPago.nombre))].join(', ')
}

function sumAmounts(items: Array<Ingreso | Egreso>) {
  return items.reduce((total, item) => total + Number(item.monto), 0)
}

function lineTotal(quantity: string, unitPrice: string) {
  return Number(quantity) * Number(unitPrice)
}

function userName(user: UsuarioResumen) {
  if (user.perfil) {
    return `${user.perfil.nombres} ${user.perfil.apellidos}`
  }

  return user.correo
}

function showPending(feature: string) {
  snackbar.message = `${feature} aún falta completar.`
  snackbar.color = 'info'
  snackbar.show = true
}

function close() {
  emit('update:modelValue', false)
}

function formatMoney(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatQuantity(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString('es-PE', {
    maximumFractionDigits: 3,
  })
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

watch(
  () => [props.modelValue, props.caja?.idCaja] as const,
  ([visible]) => {
    if (!visible) return

    resetState()
    void loadDetail()
  },
)
</script>

<style scoped>
.detail-content {
  min-height: 560px;
}

.metric-card,
.purchase-item {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.total-card {
  background: rgba(var(--v-theme-success), 0.1);
  border: 1px solid rgba(var(--v-theme-success), 0.25);
}

.cash-card {
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.25);
}

.empty-state,
.loading-state {
  padding: 56px 16px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
</style>
