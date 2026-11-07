<template>
  <div>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <div class="font-weight-bold">Distribución del pago</div>
      <v-spacer />
      <v-btn
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-plus"
        :disabled="available.length === 0"
        @click="add"
      >
        Agregar medio
      </v-btn>
    </div>
    <v-alert
      v-if="!medios.length"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      No hay medios de pago disponibles.
    </v-alert>
    <div
      v-for="(pago, index) in modelValue"
      :key="index"
      class="payment-entry mb-2"
    >
      <v-select
        :model-value="pago.idMedioPago"
        :items="optionsFor(index)"
        item-title="nombre"
        item-value="idMedioPago"
        label="Medio de pago"
        variant="outlined"
        density="comfortable"
        :hide-details="!saldos"
        :hint="
          saldos ? `Disponible en caja: ${currency(saldoDisponible(pago.idMedioPago))}` : undefined
        "
        :persistent-hint="!!saldos"
        class="flex-grow-1"
        @update:model-value="update(index, 'idMedioPago', Number($event))"
      />
      <v-text-field
        :model-value="pago.monto"
        label="Monto"
        prefix="S/"
        type="number"
        min="0.01"
        step="0.01"
        variant="outlined"
        density="comfortable"
        hide-details
        @update:model-value="update(index, 'monto', String($event ?? ''))"
      />
      <v-btn
        icon="mdi-delete-outline"
        color="error"
        variant="text"
        class="mt-1"
        aria-label="Quitar pago"
        :disabled="obligatorio && modelValue.length <= 1"
        @click="remove(index)"
      />
    </div>
    <div class="d-flex justify-end text-body-2 mt-2">
      Total distribuido:
      <strong class="ms-2 money">{{ currency(total) }}</strong>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { MedioPago } from '@/core/types/administracion.types';
import type { PagoPayload } from '../operaciones.types';
const props = defineProps<{
    modelValue: PagoPayload[];
    medios: MedioPago[];
    obligatorio?: boolean;
    saldos?: readonly PagoPayload[];
    montoObjetivo?: number;
  }>(),
  emit = defineEmits<{
    (e: 'update:modelValue', value: PagoPayload[]): void;
    (e: 'editar-monto'): void;
  }>();
const medios = computed(() =>
  props.medios.filter((x) => x.nombre.trim().toLowerCase() !== 'fraccionado'),
);
const used = computed(() => new Set(props.modelValue.map((x) => x.idMedioPago)));
const available = computed(() => medios.value.filter((x) => !used.value.has(x.idMedioPago)));
const total = computed(() => props.modelValue.reduce((sum, x) => sum + (Number(x.monto) || 0), 0));
function optionsFor(index: number) {
  return medios.value.filter(
    (x) => x.idMedioPago === props.modelValue[index]?.idMedioPago || !used.value.has(x.idMedioPago),
  );
}
function add() {
  const first = available.value[0];
  const restante = Math.round(((props.montoObjetivo ?? 0) - total.value) * 100) / 100;
  if (first)
    emit('update:modelValue', [
      ...props.modelValue,
      { idMedioPago: first.idMedioPago, monto: restante > 0 ? restante.toFixed(2) : '' },
    ]);
}
function update(index: number, key: keyof PagoPayload, value: number | string) {
  if (key === 'monto') emit('editar-monto');
  emit(
    'update:modelValue',
    props.modelValue.map((x, i) => (i === index ? { ...x, [key]: value } : x)),
  );
}
function remove(index: number) {
  if (props.obligatorio && props.modelValue.length <= 1) return;
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  );
}
function saldoDisponible(id: number) {
  return Number(props.saldos?.find((saldo) => saldo.idMedioPago === id)?.monto ?? 0);
}
function currency(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
}
</script>
<style scoped>
.payment-entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(110px, 150px) 44px;
  align-items: start;
  gap: 8px;
}
@media (max-width: 600px) {
  .payment-entry {
    grid-template-columns: minmax(0, 1fr) 44px;
    padding: 12px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 12px;
  }
  .payment-entry > .v-select {
    grid-column: 1 / -1;
  }
}
</style>
