<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="mobile"
    max-width="1280"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-xl overflow-hidden">
      <v-card-title class="cash-detail-heading d-flex align-center ga-3 pa-5 border-b">
        <v-avatar color="primary" variant="tonal" rounded="lg">
          <v-icon>mdi-file-document-outline</v-icon>
        </v-avatar>

        <div class="cash-detail-title">
          <div>Detalle de caja #{{ displayedCash?.idCaja }}</div>
          <div class="text-caption text-medium-emphasis font-weight-regular">
            {{ displayedCash?.sucursal.nombre || 'Sucursal' }} ·
            {{ formatDate(displayedCash?.fechaApertura) }}
          </div>
        </div>

        <v-spacer />

        <v-chip class="cash-detail-state" :color="isOpen ? 'primary' : 'success'" variant="tonal">
          {{ isOpen ? 'Abierta' : 'Cerrada' }}
        </v-chip>

        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar detalle de caja" @click="close" />
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
        <v-tab v-if="canSales" value="sales">
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
        <v-tab v-if="canPurchases" value="purchases">
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
          <v-btn variant="text" @click="loadDetail">Reintentar</v-btn>
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
                    Apertura + cobros + otros ingresos − gastos − pagos de compras
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

            <v-alert v-if="summary && Number(summary.diferencia) !== 0" type="warning" variant="tonal" class="mb-4">El saldo registrado difiere del historial en S/ {{ formatMoney(summary.diferencia) }}. Revisa los movimientos de esta caja.</v-alert>
            <div class="text-body-2 text-medium-emphasis mb-4">Ventas registradas: S/ {{ formatMoney(summary?.totalVentas) }} · Crédito generado: S/ {{ formatMoney(summary?.creditoOriginado) }}. Los abonos posteriores se muestran en Otros ingresos.</div>

            <v-table class="rounded-lg border" density="comfortable">
              <thead>
                <tr class="bg-primary">
                  <th class="text-white">Medio de pago</th>
                  <th class="text-white text-end">Ventas</th>
                  <th class="text-white text-end">Ingresos</th>
                  <th class="text-white text-end">Egresos</th>
                  <th class="text-white text-end">Compras</th>
                  <th class="text-white text-end">Neto</th>
                  <th class="text-white text-end">Saldo</th>
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
                  <td class="text-end font-weight-bold">S/ {{ formatMoney(method.saldo) }}</td>
                </tr>

                <tr v-if="!paymentSummaries.length">
                  <td colspan="7" class="text-center text-medium-emphasis py-8">
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

            <v-alert v-if="collectionErrors.sales" type="error" variant="tonal" class="mb-4">{{ collectionErrors.sales }}<v-btn variant="text" @click="loadCollection('sales')">Reintentar</v-btn></v-alert>
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
                <div class="text-h6 font-weight-bold">Otros ingresos</div>
                <div class="text-body-2 text-medium-emphasis">
                  Entradas de dinero distintas a las ventas.
                </div>
              </div>

              <v-spacer />

              <v-btn
                v-if="isOpen && canMovements"
                color="primary"
                prepend-icon="mdi-plus"
                @click="openRegistration('ingresos')"
              >
                Registrar ingreso
              </v-btn>
            </div>

            <v-alert v-if="collectionErrors.incomes" type="error" variant="tonal" class="mb-4">{{ collectionErrors.incomes }}<v-btn variant="text" @click="loadCollection('incomes')">Reintentar</v-btn></v-alert>
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
                v-if="isOpen && canMovements"
                color="error"
                variant="tonal"
                prepend-icon="mdi-plus"
                @click="openRegistration('egresos')"
              >
                Registrar egreso
              </v-btn>
            </div>

            <v-alert v-if="collectionErrors.expenses" type="error" variant="tonal" class="mb-4">{{ collectionErrors.expenses }}<v-btn variant="text" @click="loadCollection('expenses')">Reintentar</v-btn></v-alert>
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
                v-if="isOpen && auth.puede(Permiso.COMPRAS_GESTIONAR)"
                color="primary"
                prepend-icon="mdi-plus"
                @click="openRegistration('compras')"
              >
                Registrar compra
              </v-btn>
            </div>

            <v-alert v-if="collectionErrors.purchases" type="error" variant="tonal" class="mb-4">{{ collectionErrors.purchases }}<v-btn variant="text" @click="loadCollection('purchases')">Reintentar</v-btn></v-alert>
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

</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { getApiErrorMessage } from '@/core/api/api-error'
import { Permiso } from '@/core/constants/permisos'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useSucursalStore } from '@/shared/stores/sucursal.store'
import { cajasApi, cargarTodo, comprasApi, egresosApi, ingresosApi, ventasApi } from '../operaciones.api'
import type { Caja, Compra, Egreso, Ingreso, Pago, ResumenCaja, UsuarioResumen } from '../operaciones.types'

type DetailTab = 'summary' | 'sales' | 'incomes' | 'expenses' | 'purchases'
type CollectionName = Exclude<DetailTab, 'summary'>
interface PaginationState { currentPage: number; lastPage: number; perPage: number }
const props = withDefaults(defineProps<{ modelValue: boolean; caja: Caja | null; branchId?: number | null; initialTab?: DetailTab }>(), { branchId: null, initialTab: 'summary' })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { mobile } = useDisplay()
const auth = useAuthStore(), branch = useSucursalStore(), router = useRouter()
const tab = ref<DetailTab>('summary'), cashDetail = ref<Caja | null>(null), summary = ref<ResumenCaja | null>(null)
const sales = ref<Ingreso[]>([]), incomes = ref<Ingreso[]>([]), expenses = ref<Egreso[]>([]), purchases = ref<Compra[]>([])
const initialLoading = ref(false), error = ref('')
const loading = reactive<Record<CollectionName, boolean>>({ sales: false, incomes: false, expenses: false, purchases: false })
const collectionErrors = reactive<Record<CollectionName, string>>({ sales: '', incomes: '', expenses: '', purchases: '' })
const loaded = new Set<CollectionName>()
const pagination = reactive<Record<CollectionName, PaginationState>>({ sales: pageState(), incomes: pageState(), expenses: pageState(), purchases: pageState() })
let request = 0
const displayedCash = computed(() => cashDetail.value ?? props.caja)
const isOpen = computed(() => Boolean(displayedCash.value && !displayedCash.value.fechaCierre))
const canSales = computed(() => auth.puede(Permiso.VENTAS_VER))
const canPurchases = computed(() => auth.puede(Permiso.COMPRAS_VER))
const canMovements = computed(() => auth.puede(Permiso.CAJA_GESTIONAR))
const totalCalculated = computed(() => summary.value?.saldoCalculado ?? '0.00')
const expectedCash = computed(() => summary.value?.efectivoEsperado ?? '0.00')
const paymentSummaries = computed(() => summary.value?.mediosPago ?? [])
const summaryMetrics = computed(() => [
  { label: 'Apertura', value: summary.value?.apertura ?? 0, icon: 'mdi-lock-open-outline', color: 'primary' },
  { label: 'Ventas cobradas', value: summary.value?.cobrosVentas ?? 0, count: summary.value?.cantidades.ventas, icon: 'mdi-receipt-text-outline', color: 'success' },
  { label: 'Otros ingresos', value: summary.value?.ingresos ?? 0, count: summary.value?.cantidades.ingresos, icon: 'mdi-cash-plus', color: 'success' },
  { label: 'Gastos', value: summary.value?.egresos ?? 0, count: summary.value?.cantidades.egresos, icon: 'mdi-cash-minus', color: 'error' },
  { label: 'Pagos de compras', value: summary.value?.compras ?? 0, count: summary.value?.cantidades.compras, icon: 'mdi-cart-arrow-down', color: 'error' },
  { label: 'Salidas totales', value: summary.value?.salidas ?? 0, icon: 'mdi-arrow-down-bold-circle-outline', color: 'error' },
])
const paginatedSales = computed(() => paginate(sales.value, pagination.sales))
const paginatedIncomes = computed(() => paginate(incomes.value, pagination.incomes))
const paginatedExpenses = computed(() => paginate(expenses.value, pagination.expenses))
const paginatedPurchases = computed(() => paginate(purchases.value, pagination.purchases))
function pageState(): PaginationState { return { currentPage: 1, lastPage: 1, perPage: 10 } }
function paginate<T>(items: T[], state: PaginationState) { return items.slice((state.currentPage - 1) * state.perPage, state.currentPage * state.perPage) }
async function loadDetail() {
  if (!props.caja) return
  const current = ++request, cajaId = props.caja.idCaja
  initialLoading.value = true; error.value = ''
  try {
    const { data } = await cajasApi.resumen(cajaId)
    if (current !== request) return
    cashDetail.value = data.caja; summary.value = data.resumen
    if (tab.value !== 'summary') void loadCollection(tab.value)
  } catch (cause) { if (current === request) error.value = getApiErrorMessage(cause, 'No se pudo cargar el resumen de caja.') }
  finally { if (current === request) initialLoading.value = false }
}
async function loadCollection(name: CollectionName) {
  if (!displayedCash.value || loaded.has(name) || loading[name]) return
  if ((name === 'sales' && !canSales.value) || (name === 'purchases' && !canPurchases.value)) return
  const current = request, caja = displayedCash.value
  loading[name] = true; collectionErrors[name] = ''
  const consulta = { idCaja: caja.idCaja, idSucursal: caja.idSucursal }
  try {
    if (name === 'sales') { const rows = await cargarTodo(ventasApi.listar, consulta); if (current !== request) return; sales.value = rows }
    else if (name === 'incomes') { const rows = await cargarTodo(ingresosApi.listar, consulta); if (current !== request) return; incomes.value = rows.filter(item => item.idMotivoIngreso !== 1) }
    else if (name === 'expenses') { const rows = await cargarTodo(egresosApi.listar, consulta); if (current !== request) return; expenses.value = rows.filter(item => item.idCompra === null && item.idMotivoEgreso !== 3) }
    else { const rows = await cargarTodo(comprasApi.listar, consulta); if (current !== request) return; purchases.value = rows }
    loaded.add(name)
    const total = { sales: sales.value.length, incomes: incomes.value.length, expenses: expenses.value.length, purchases: purchases.value.length }[name]
    pagination[name].lastPage = Math.max(1, Math.ceil(total / pagination[name].perPage))
  } catch (cause) { if (current === request) collectionErrors[name] = getApiErrorMessage(cause, 'No se pudo cargar esta pestaña.') }
  finally { if (current === request) loading[name] = false }
}
async function openRegistration(name: 'ingresos' | 'egresos' | 'compras') {
  const caja = displayedCash.value
  if (!caja || !isOpen.value || (name === 'compras' ? !auth.puede(Permiso.COMPRAS_GESTIONAR) : !canMovements.value)) return
  branch.seleccionar(caja.idSucursal)
  await router.push({ name: `operaciones-${name}`, query: { registrar: '1', idCaja: caja.idCaja } })
  close()
}
function purchaseExpenses(purchase: Compra) { return purchase.egresos.filter(expense => expense.idCaja === displayedCash.value?.idCaja) }
function purchaseCashAmount(purchase: Compra) { return purchaseExpenses(purchase).reduce((sum, expense) => sum + expense.pagos.reduce((amount, pago) => amount + Number(pago.monto), 0), 0) }
function purchasePaymentNames(purchase: Compra) { return paymentNames(purchaseExpenses(purchase).flatMap(expense => expense.pagos)) }
function paymentNames(payments: Pago[]) { return [...new Set(payments.map(payment => payment.medioPago.nombre))].join(', ') || 'Sin medio de pago' }
function lineTotal(quantity: string, price: string) { return Number(quantity) * Number(price) }
function userName(user: UsuarioResumen) { return user.perfil ? `${user.perfil.nombres} ${user.perfil.apellidos}` : user.correo }
function close() { emit('update:modelValue', false) }
function formatMoney(value: string | number | null | undefined) { return Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function formatQuantity(value: string | number | null | undefined) { return Number(value || 0).toLocaleString('es-PE', { maximumFractionDigits: 3 }) }
function formatDate(value: string | null | undefined) { return value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—' }
watch(tab, value => { if (value !== 'summary' && summary.value) void loadCollection(value) })
watch(() => [props.modelValue, props.caja?.idCaja] as const, ([visible]) => {
  request++; loaded.clear()
  if (!visible) return
  tab.value = props.initialTab === 'sales' && !canSales.value || props.initialTab === 'purchases' && !canPurchases.value ? 'summary' : props.initialTab
  cashDetail.value = null; summary.value = null; sales.value = []; incomes.value = []; expenses.value = []; purchases.value = []; error.value = ''
  for (const name of Object.keys(loading) as CollectionName[]) { loading[name] = false; collectionErrors[name] = ''; Object.assign(pagination[name], pageState()) }
  void loadDetail()
}, { immediate: true })
onBeforeUnmount(() => { request++ })
</script>

<style scoped>
.cash-detail-title { min-width: 0; white-space: normal; }
@media (max-width: 600px) {
  .cash-detail-heading { display: grid !important; grid-template-columns: 40px minmax(0, 1fr) 44px; gap: 8px !important; padding: 16px !important; }
  .cash-detail-heading > .v-spacer { display: none; }
  .cash-detail-heading > .v-avatar { grid-column: 1; grid-row: 1 / span 2; }
  .cash-detail-state { grid-column: 2; grid-row: 2; justify-self: start; }
  .cash-detail-heading > .v-btn { grid-column: 3; grid-row: 1 / span 2; }
}
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
