<template>
  <v-dialog v-model="visible" max-width="1040" scrollable persistent>
    <v-card rounded="xl" class="pos-checkout-card">
      <header class="pos-checkout-heading">
        <v-avatar color="rgba(255,255,255,.18)" size="44"
          ><v-icon>mdi-cash-register</v-icon></v-avatar
        >
        <div>
          <h2>Procesar venta</h2>
          <p>
            {{ branchName }} ·
            {{ mode === 'cash' ? 'Pago completo' : 'Pago pendiente' }}
          </p>
        </div>
        <v-spacer /><v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Cerrar cobro"
          :disabled="saving"
          @click="visible = false"
        />
      </header>
      <v-card-text class="pos-checkout-body">
        <v-alert v-if="error" type="error" variant="tonal" class="mb-5">{{
          error
        }}</v-alert>
        <v-progress-linear
          v-if="loading"
          indeterminate
          color="primary"
          class="mb-5"
        />
        <div class="pos-checkout-grid">
          <section class="pos-checkout-customer">
            <h3 class="pos-section-label">
              <v-icon size="18">mdi-receipt-text-outline</v-icon>Comprobante
            </h3>
            <div class="pos-receipt-fields">
              <v-select
                :model-value="'Documento interno'"
                :items="['Documento interno']"
                label="Tipo de comprobante"
                variant="outlined"
                density="comfortable"
                hide-details
                disabled
              />
              <v-text-field
                model-value="—"
                label="Serie"
                variant="outlined"
                density="comfortable"
                hide-details
                disabled
              />
            </div>
            <h3 class="pos-section-label mt-6">
              <v-icon size="18">mdi-account-outline</v-icon>Cliente
            </h3>
            <div class="pos-client-fields">
              <v-text-field
                v-model="document"
                label="Documento"
                variant="outlined"
                density="comfortable"
                hide-details
                :disabled="saving"
                @keyup.enter="searchDocument"
              >
                <template #append-inner
                  ><v-btn
                    icon="mdi-magnify"
                    size="small"
                    variant="text"
                    aria-label="Buscar cliente por documento"
                    :disabled="saving || !document.trim()"
                    @click="searchDocument"
                /></template>
              </v-text-field>
              <v-autocomplete
                v-model="clientId"
                :items="clientOptions"
                item-title="label"
                item-value="id"
                label="Buscar cliente (nombre / documento)"
                variant="outlined"
                density="comfortable"
                hide-details
                :loading="clientsLoading"
                :disabled="saving || !canReadClients"
                @update:model-value="selectClient"
              >
                <template #item="{ props: itemProps, item }"
                  ><v-list-item
                    v-bind="itemProps"
                    :title="item.nombre"
                    :subtitle="
                      item.esGenerico
                        ? 'Compra sin identificación'
                        : item.numeroDocumento
                    "
                /></template>
              </v-autocomplete>
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-account-plus-outline"
                :disabled="saving || !canCreateClients"
                @click="$emit('new-client', document)"
                >Nuevo</v-btn
              >
            </div>
            <v-alert
              v-if="documentError || clientsError"
              type="warning"
              variant="tonal"
              class="mt-3"
              >{{ documentError || clientsError }}</v-alert
            >
            <v-sheet
              v-if="selectedClient || !clientId"
              border
              rounded="lg"
              class="pos-selected-client mt-3"
              ><v-icon color="success" size="20"
                >mdi-check-circle-outline</v-icon
              ><strong>{{ selectedClient?.nombre ?? 'Clientes varios' }}</strong
              ><span
                v-if="selectedClient && !selectedClient.esGenerico"
                class="text-medium-emphasis"
                >{{ selectedClient.numeroDocumento }}</span
              ></v-sheet
            >
            <v-textarea
              v-model="note"
              label="Comentario / Notas"
              rows="3"
              auto-grow
              maxlength="500"
              variant="outlined"
              hide-details
              class="mt-5"
              :disabled="saving"
            />
            <v-text-field
              v-if="mode === 'credit'"
              v-model="dueDate"
              label="Fecha de vencimiento (opcional)"
              type="date"
              variant="outlined"
              hide-details
              class="mt-5"
              :disabled="saving"
            />
          </section>
          <section class="pos-checkout-payment">
            <h3 class="pos-section-label">
              <v-icon size="18">mdi-credit-card-outline</v-icon>Método de pago
            </h3>
            <v-select
              v-model="mode"
              :items="[
                { title: 'Pago completo', value: 'cash' },
                { title: 'Pago pendiente', value: 'credit' },
              ]"
              label="Condición de pago"
              variant="outlined"
              density="comfortable"
              hide-details
              :disabled="saving || loading"
              @update:model-value="changeMode"
            />
            <template v-if="!split">
              <v-select
                v-model="methodId"
                :items="methods"
                item-title="nombre"
                item-value="idMedioPago"
                label="Medio de pago"
                variant="outlined"
                density="comfortable"
                hide-details
                class="mt-4"
                :disabled="saving || loading"
                @update:model-value="changeMethod"
              />
              <v-text-field
                v-if="mode === 'credit'"
                v-model="initialAmount"
                label="Pago inicial (opcional)"
                prefix="S/"
                type="number"
                min="0"
                :max="total"
                step="0.01"
                variant="outlined"
                hide-details
                class="mt-4"
                :disabled="saving || loading"
                @update:model-value="changeMethod"
              />
            </template>
            <PagosEditor
              v-else
              v-model="payments"
              :medios="methods"
              :inert="saving"
              class="mt-4"
            />
            <div class="pos-payment-tools">
              <span class="text-body-2 text-medium-emphasis">Soles (PEN)</span
              ><v-btn
                variant="text"
                color="primary"
                size="small"
                :disabled="saving || loading"
                @click="toggleSplit"
                >{{ split ? 'Un solo medio' : 'Dividir pago' }}</v-btn
              >
            </div>
            <div v-if="cashAmount > 0" class="pos-cash-cards">
              <div class="pos-cash-card">
                <label for="pos-cash-received">Efectivo recibido</label>
                <div class="pos-cash-input">
                  <span>S/</span
                  ><input
                    id="pos-cash-received"
                    v-model="received"
                    aria-label="Efectivo recibido"
                    type="number"
                    min="0"
                    step="0.01"
                    :disabled="saving"
                  />
                </div>
              </div>
              <div class="pos-cash-card">
                <span class="pos-cash-label">Vuelto</span
                ><strong class="text-success">{{ money(change) }}</strong>
              </div>
            </div>
            <div v-if="mode === 'credit'" class="pos-pending-amount">
              Saldo pendiente
              <strong>{{ money(Math.max(0, total - paid)) }}</strong>
            </div>
            <v-alert v-if="issue" type="warning" variant="tonal" class="mt-4">{{
              issue
            }}</v-alert>
          </section>
        </div>
      </v-card-text>
      <footer class="pos-checkout-footer">
        <v-btn variant="text" :disabled="saving" @click="visible = false"
          >Cancelar</v-btn
        ><v-spacer />
        <div class="pos-checkout-total">
          <span>Total a cobrar</span><strong>{{ money(total) }}</strong>
        </div>
        <v-btn
          color="success"
          variant="flat"
          size="large"
          prepend-icon="mdi-check-circle-outline"
          :loading="saving"
          :disabled="!canSubmit || loading || !!issue"
          @click="$emit('submit')"
          >Procesar</v-btn
        >
      </footer>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  MedioPago,
  PersonaRegistro,
} from '@/core/types/administracion.types'
import type { PagoPayload } from '@/modules/operaciones/operaciones.types'
import PagosEditor from '@/modules/operaciones/components/PagosEditor.vue'

const props = defineProps<{
  branchName: string
  total: number
  paid: number
  cashAmount: number
  change: number
  clients: PersonaRegistro[]
  methods: MedioPago[]
  clientsLoading: boolean
  clientsError: string
  canReadClients: boolean
  canCreateClients: boolean
  saving: boolean
  loading: boolean
  error: string
  issue: string
  canSubmit: boolean
}>()
defineEmits<{ submit: []; 'new-client': [document: string] }>()
const visible = defineModel<boolean>({ required: true })
const payments = defineModel<PagoPayload[]>('payments', { required: true })
const mode = defineModel<string>('mode', { required: true })
const clientId = defineModel<number | null>('clientId', { required: true })
const received = defineModel<string>('received', { required: true })
const dueDate = defineModel<string>('dueDate', { required: true })
const note = defineModel<string>('note', { required: true })
const split = ref(false),
  document = ref(''),
  documentError = ref(''),
  methodId = ref<number | null>(null),
  initialAmount = ref('0.00')
const selectedClient = computed(() =>
  props.clients.find((client) => client.id === clientId.value),
)
const clientOptions = computed(() =>
  props.clients.map((client) => ({
    ...client,
    label: client.esGenerico
      ? client.nombre
      : `${client.nombre} · ${client.numeroDocumento}`,
  })),
)
function money(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(value)
}
function selectClient() {
  document.value = selectedClient.value?.esGenerico
    ? ''
    : (selectedClient.value?.numeroDocumento ?? '')
  documentError.value = ''
}
function searchDocument() {
  const match = props.clients.find(
    (client) =>
      !client.esGenerico &&
      client.numeroDocumento.toUpperCase() ===
        document.value.trim().toUpperCase(),
  )
  if (match) {
    clientId.value = match.id
    documentError.value = ''
  } else
    documentError.value =
      'No hay un cliente registrado con ese documento. Usa Nuevo para registrarlo.'
}
function changeMethod() {
  if (split.value) return
  const amount =
    mode.value === 'cash' ? props.total : Number(initialAmount.value)
  payments.value =
    methodId.value && amount > 0
      ? [{ idMedioPago: methodId.value, monto: amount.toFixed(2) }]
      : []
  if (
    props.methods
      .find((method) => method.idMedioPago === methodId.value)
      ?.nombre.toLowerCase() === 'efectivo'
  )
    received.value = amount > 0 ? amount.toFixed(2) : ''
}
function changeMode(value: string) {
  initialAmount.value = '0.00'
  split.value = false
  payments.value =
    value === 'cash' && methodId.value
      ? [{ idMedioPago: methodId.value, monto: props.total.toFixed(2) }]
      : []
  received.value = value === 'cash' ? props.total.toFixed(2) : ''
}
function toggleSplit() {
  split.value = !split.value
  if (!split.value) changeMethod()
}
watch(
  () => props.methods,
  () => {
    methodId.value =
      payments.value[0]?.idMedioPago ??
      props.methods.find((method) => method.nombre.toLowerCase() === 'efectivo')
        ?.idMedioPago ??
      props.methods[0]?.idMedioPago ??
      null
  },
  { immediate: true },
)
watch(visible, (value) => {
  if (value) {
    split.value = false
    initialAmount.value = '0.00'
    selectClient()
  }
})
watch(clientId, selectClient)
</script>
