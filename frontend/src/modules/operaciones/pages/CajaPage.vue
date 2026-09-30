<template>
  <div class="operaciones-page">
    <v-card class="operaciones-header mb-5 rounded-xl" elevation="0" border>
      <v-card-text class="pa-5">
        <div class="d-flex align-center flex-wrap ga-3">
          <v-avatar color="primary" variant="tonal" size="48" rounded="lg">
            <v-icon size="27">mdi-cash-register</v-icon>
          </v-avatar>

          <div>
            <div class="text-h6 font-weight-bold">Control de caja</div>
            <div class="text-body-2 text-medium-emphasis">
              Apertura, saldos por medio de pago y cierre diario
            </div>
          </div>

          <v-spacer />

          <v-chip color="primary" variant="tonal" prepend-icon="mdi-store-outline">
            {{ branch.sucursalActual?.nombre || 'Sin sucursal' }}
          </v-chip>

          <v-btn
            v-if="canManage && branch.idSucursalActual && !openBox"
            color="primary"
            prepend-icon="mdi-lock-open-variant-outline"
            rounded="lg"
            @click="openOpenDialog"
          >
            Abrir caja
          </v-btn>

          <v-btn
            v-if="canManage && openBox"
            color="error"
            variant="tonal"
            prepend-icon="mdi-lock-outline"
            rounded="lg"
            @click="openCloseDialog(openBox)"
          >
            Cerrar caja
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>

    <v-alert
      v-if="!branch.idSucursalActual"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      Selecciona una sucursal para consultar la caja.
    </v-alert>

    <template v-else>
      <v-row class="mb-3">
        <v-col cols="12" md="4">
          <v-card class="operaciones-metric rounded-xl" border elevation="0">
            <v-card-text>
              <div class="text-caption text-medium-emphasis">Estado actual</div>
              <div class="d-flex align-center mt-2">
                <v-icon
                  :color="openBox ? 'success' : 'medium-emphasis'"
                  size="32"
                >
                  {{ openBox ? 'mdi-lock-open-check-outline' : 'mdi-lock-outline' }}
                </v-icon>
                <div class="text-h6 font-weight-bold ms-3">
                  {{ openBox ? 'Caja abierta' : 'Caja cerrada' }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="operaciones-metric rounded-xl" border elevation="0">
            <v-card-text>
              <div class="d-flex align-center ga-2 text-caption text-medium-emphasis">
                <v-icon size="18" color="primary">mdi-calculator-variant-outline</v-icon>
                Saldo esperado
              </div>
              <div class="text-h5 font-weight-bold money mt-2">
                {{ money(expectedTotal) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="operaciones-metric rounded-xl" border elevation="0">
            <v-card-text>
              <div class="d-flex align-center ga-2 text-caption text-medium-emphasis">
                <v-icon size="18" color="primary">mdi-cash-plus</v-icon>
                Monto de apertura
              </div>
              <div class="text-h5 font-weight-bold money mt-2">
                {{ money(openBox?.montoApertura) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card
        v-if="openBox"
        rounded="xl"
        elevation="0"
        border
        class="mb-5"
      >
        <v-card-title class="pa-5 pb-2 d-flex align-center flex-wrap ga-2">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
            <v-icon>mdi-wallet-outline</v-icon>
          </v-avatar>
          <span>Saldos por medio de pago</span>
          <v-spacer />
          <span class="text-caption text-medium-emphasis">
            Abierta {{ dateTime(openBox.fechaApertura) }}
          </span>
        </v-card-title>

        <v-card-text class="pa-5">
          <v-row>
            <v-col
              v-for="detail in openBox.detalles"
              :key="detail.idMedioPago"
              cols="12"
              sm="6"
              md="4"
            >
              <v-card variant="tonal" color="primary" rounded="lg">
                <v-card-text class="d-flex align-center">
                  <v-icon size="28">
                    {{ paymentIcon(detail.medioPago.nombre) }}
                  </v-icon>
                  <div class="ms-3">
                    <div class="text-caption">{{ detail.medioPago.nombre }}</div>
                    <div class="text-h6 font-weight-bold money">
                      {{ money(detail.monto) }}
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col v-if="!openBox.detalles.length" cols="12">
              <div class="text-center text-medium-emphasis py-4">
                La caja no tiene saldos registrados.
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card rounded="xl" elevation="0" border class="overflow-hidden">
        <v-card-item class="pa-5">
          <template #prepend>
            <v-avatar color="primary" variant="tonal" rounded="lg" class="me-3">
              <v-icon>mdi-history</v-icon>
            </v-avatar>
          </template>

          <v-card-title class="font-weight-bold">Historial de cajas</v-card-title>
          <v-card-subtitle>
            Consulta aperturas, cierres y saldos de la sucursal seleccionada.
          </v-card-subtitle>

          <template #append>
            <div class="d-flex align-center ga-2">
              <v-chip color="primary" variant="tonal" class="history-total-chip">
                {{ total }} registros
              </v-chip>

              <v-tooltip text="Actualizar historial" location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-refresh"
                    variant="tonal"
                    color="primary"
                    :loading="loading"
                    @click="load"
                  />
                </template>
              </v-tooltip>
            </div>
          </template>
        </v-card-item>

        <v-divider />

        <div v-if="loading" class="text-center py-14">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <template v-else-if="items.length">
          <v-table hover class="operaciones-table operaciones-desktop">
            <thead>
              <tr>
                <th>N.º</th>
                <th>Estado</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Responsable</th>
                <th class="text-end">Monto apertura</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.idCaja">
                <td class="font-weight-medium">#{{ item.idCaja }}</td>
                <td>
                  <v-chip
                    size="small"
                    :color="item.fechaCierre ? 'default' : 'success'"
                    variant="tonal"
                    :prepend-icon="item.fechaCierre
                      ? 'mdi-lock-outline'
                      : 'mdi-lock-open-variant-outline'"
                  >
                    {{ item.fechaCierre ? 'Cerrada' : 'Abierta' }}
                  </v-chip>
                </td>
                <td>{{ dateTime(item.fechaApertura) }}</td>
                <td>{{ dateTime(item.fechaCierre) }}</td>
                <td>{{ user(item.usuarioApertura) }}</td>
                <td class="text-end money font-weight-medium">
                  {{ money(item.montoApertura) }}
                </td>
                <td class="text-center">
                  <div class="d-inline-flex align-center ga-1">
                    <v-tooltip text="Ver detalle" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-file-document-outline"
                          variant="text"
                          color="primary"
                          size="small"
                          @click="openDetailDialog(item)"
                        />
                      </template>
                    </v-tooltip>

                    <v-tooltip
                      v-if="!item.fechaCierre && canManage"
                      text="Cerrar caja"
                      location="top"
                    >
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-lock-outline"
                          variant="text"
                          color="error"
                          size="small"
                          @click="openCloseDialog(item)"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>

          <div class="operaciones-mobile pa-3">
            <v-card
              v-for="item in items"
              :key="item.idCaja"
              variant="outlined"
              rounded="lg"
              class="mb-3"
            >
              <v-card-text>
                <div class="d-flex align-center">
                  <strong>Caja #{{ item.idCaja }}</strong>
                  <v-spacer />
                  <v-chip
                    size="x-small"
                    :color="item.fechaCierre ? 'default' : 'success'"
                    variant="tonal"
                  >
                    {{ item.fechaCierre ? 'Cerrada' : 'Abierta' }}
                  </v-chip>
                </div>

                <div class="text-caption text-medium-emphasis mt-3">
                  <v-icon size="15" class="me-1">mdi-calendar-start</v-icon>
                  {{ dateTime(item.fechaApertura) }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  <v-icon size="15" class="me-1">mdi-account-outline</v-icon>
                  {{ user(item.usuarioApertura) }}
                </div>
                <div class="font-weight-bold money mt-3">
                  {{ money(item.montoApertura) }}
                </div>
              </v-card-text>

              <v-divider />

              <v-card-actions>
                <v-btn
                  color="primary"
                  variant="text"
                  prepend-icon="mdi-file-document-outline"
                  @click="openDetailDialog(item)"
                >
                  Ver detalle
                </v-btn>
                <v-spacer />
                <v-btn
                  v-if="!item.fechaCierre && canManage"
                  color="error"
                  variant="text"
                  prepend-icon="mdi-lock-outline"
                  @click="openCloseDialog(item)"
                >
                  Cerrar
                </v-btn>
              </v-card-actions>
            </v-card>
          </div>
        </template>

        <div v-else class="operaciones-empty">
          <v-avatar color="primary" variant="tonal" size="62" class="mb-3">
            <v-icon size="34">mdi-cash-register</v-icon>
          </v-avatar>
          <div class="font-weight-bold">Aún no hay cajas registradas</div>
          <div class="text-body-2 mt-1">
            La primera apertura aparecerá en este historial.
          </div>
        </div>

        <v-divider />

        <div class="d-flex align-center justify-space-between pa-3 px-5">
          <span class="text-caption">
            Mostrando {{ items.length }} de {{ total }}
          </span>
          <v-pagination
            v-if="total > limit"
            v-model="page"
            :length="Math.ceil(total / limit)"
            size="small"
          />
        </div>
      </v-card>
    </template>

    <v-dialog v-model="openDialog" max-width="560" persistent>
      <v-card rounded="xl">
        <v-card-title class="operaciones-dialog-title">
          <span class="operaciones-dialog-icon">
            <v-icon>mdi-lock-open-variant-outline</v-icon>
          </span>
          Abrir caja
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            color="on-primary"
            @click="openDialog = false"
          />
        </v-card-title>

        <v-card-text class="pa-5">
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ formError }}
          </v-alert>

          <label class="operaciones-field-label">Monto inicial</label>
          <v-text-field
            v-model="openingAmount"
            prefix="S/"
            type="number"
            min="0"
            step="0.01"
            variant="outlined"
            hint="Efectivo físico disponible al iniciar la caja"
            persistent-hint
            autofocus
            @update:model-value="formError = ''"
            @keyup.enter="openCash"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="openDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="openCash">
            Abrir caja
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="closeDialog" max-width="560" persistent>
      <v-card rounded="xl">
        <v-card-title class="operaciones-dialog-title close-dialog-title">
          <span class="operaciones-dialog-icon">
            <v-icon>mdi-lock-outline</v-icon>
          </span>
          Cerrar caja #{{ closingBox?.idCaja }}
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            color="on-error"
            @click="closeDialog = false"
          />
        </v-card-title>

        <v-card-text class="pa-5">
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ formError }}
          </v-alert>

          <v-card variant="tonal" color="primary" rounded="lg" class="mb-4">
            <v-card-text class="d-flex align-center">
              <v-icon size="28">mdi-calculator-variant-outline</v-icon>
              <div class="ms-3">
                <div class="text-caption">Saldo esperado</div>
                <div class="text-h6 font-weight-bold money">
                  {{ money(closingExpectedTotal) }}
                </div>
              </div>
            </v-card-text>
          </v-card>

          <label class="operaciones-field-label">Monto contado *</label>
          <v-text-field
            v-model="closingAmount"
            prefix="S/"
            type="number"
            min="0"
            step="0.01"
            variant="outlined"
            autofocus
            @update:model-value="formError = ''"
            @keyup.enter="closeCash"
          />

          <v-alert type="warning" variant="tonal" density="compact">
            El cierre es definitivo y conservará cualquier diferencia de caja.
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog = false">Cancelar</v-btn>
          <v-btn color="error" :loading="saving" @click="closeCash">
            Confirmar cierre
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CajaDetalleDialog
      v-model="detailDialog"
      :caja="selectedBox"
      :branch-id="branch.idSucursalActual"
    />

    <v-snackbar v-model="noticeVisible" color="success">
      {{ notice }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getApiErrorMessage } from '@/core/api/api-error'
import { Permiso } from '@/core/constants/permisos'
import { useAuthStore } from '@/modules/auth/auth.store'
import { useSucursalStore } from '@/shared/stores/sucursal.store'
import CajaDetalleDialog from '../components/CajaDetalleDialog.vue'
import { cajasApi } from '../operaciones.api'
import type { Caja, UsuarioResumen } from '../operaciones.types'
import '../operaciones.css'

const auth = useAuthStore()
const branch = useSucursalStore()

const canManage = computed(() => auth.puede(Permiso.CAJA_GESTIONAR))

const openBox = ref<Caja | null>(null)
const selectedBox = ref<Caja | null>(null)
const closingBox = ref<Caja | null>(null)
const items = ref<Caja[]>([])

const loading = ref(false)
const saving = ref(false)

const error = ref('')
const formError = ref('')

const openDialog = ref(false)
const closeDialog = ref(false)
const detailDialog = ref(false)

const openingAmount = ref('0.00')
const closingAmount = ref('')

const page = ref(1)
const total = ref(0)
const limit = 20

const notice = ref('')
const noticeVisible = ref(false)

const expectedTotal = computed(() => boxExpectedTotal(openBox.value))
const closingExpectedTotal = computed(() => boxExpectedTotal(closingBox.value))

async function load() {
  if (!branch.idSucursalActual) {
    openBox.value = null
    items.value = []
    total.value = 0
    return
  }

  loading.value = true
  error.value = ''

  try {
    const history = await cajasApi.listar({
      idSucursal: branch.idSucursalActual,
      pagina: page.value,
      limite: limit,
    })

    items.value = history.data.data
    total.value = history.data.total

    try {
      const response = await cajasApi.abierta(branch.idSucursalActual)
      openBox.value = response.data
    } catch {
      openBox.value = null
    }
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'No se pudo cargar la caja')
  } finally {
    loading.value = false
  }
}

function openOpenDialog() {
  openingAmount.value = '0.00'
  formError.value = ''
  openDialog.value = true
}

async function openCash() {
  if (!branch.idSucursalActual) return

  const amount = Number(openingAmount.value)

  if (!Number.isFinite(amount) || amount < 0) {
    formError.value = 'Ingresa un monto inicial válido'
    return
  }

  saving.value = true
  formError.value = ''

  try {
    await cajasApi.abrir({
      idSucursal: branch.idSucursalActual,
      montoApertura: amount.toFixed(2),
    })

    openDialog.value = false
    showNotice('Caja abierta correctamente')
    await load()
  } catch (cause) {
    formError.value = getApiErrorMessage(cause, 'No se pudo abrir la caja')
  } finally {
    saving.value = false
  }
}

function openDetailDialog(item: Caja) {
  selectedBox.value = item
  detailDialog.value = true
}

function openCloseDialog(item: Caja | null) {
  if (!item || item.fechaCierre) return

  closingBox.value = item
  closingAmount.value = boxExpectedTotal(item).toFixed(2)
  formError.value = ''
  closeDialog.value = true
}

async function closeCash() {
  if (!closingBox.value) return

  const amount = Number(closingAmount.value)

  if (!Number.isFinite(amount) || amount < 0) {
    formError.value = 'Ingresa un monto contado válido'
    return
  }

  saving.value = true
  formError.value = ''

  try {
    await cajasApi.cerrar(closingBox.value.idCaja, amount.toFixed(2))

    closeDialog.value = false
    closingBox.value = null
    showNotice('Caja cerrada correctamente')
    await load()
  } catch (cause) {
    formError.value = getApiErrorMessage(cause, 'No se pudo cerrar la caja')
  } finally {
    saving.value = false
  }
}

function boxExpectedTotal(caja: Caja | null) {
  return caja?.detalles.reduce(
    (sum, detail) => sum + Number(detail.monto),
    0,
  ) ?? 0
}

function showNotice(message: string) {
  notice.value = message
  noticeVisible.value = true
}

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0)
}

function dateTime(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function user(value: UsuarioResumen) {
  if (value.perfil) {
    return `${value.perfil.nombres} ${value.perfil.apellidos}`
  }

  return value.correo
}

function paymentIcon(name: string) {
  const normalizedName = name.toLowerCase()

  if (normalizedName.includes('efectivo')) return 'mdi-cash-multiple'
  if (normalizedName.includes('tarjeta')) return 'mdi-credit-card-outline'
  if (normalizedName.includes('yape') || normalizedName.includes('plin')) {
    return 'mdi-cellphone-check'
  }

  return 'mdi-wallet-outline'
}

watch(
  () => branch.idSucursalActual,
  () => {
    if (page.value !== 1) {
      page.value = 1
      return
    }

    void load()
  },
  { immediate: true },
)

watch(page, () => {
  void load()
})
</script>

<style scoped>
.history-total-chip {
  display: inline-flex;
}

.close-dialog-title {
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-on-error));
}

@media (max-width: 600px) {
  .history-total-chip {
    display: none;
  }
}
</style>
