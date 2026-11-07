<template>
  <v-dialog v-model="open" max-width="440" scrollable>
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center ga-2 pa-4">
        <v-icon color="primary">mdi-scale</v-icon>
        <span>Agregar peso</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar peso" @click="open = false" />
      </v-card-title>
      <v-divider />
      <v-card-text v-if="product" class="pa-5">
        <p class="text-subtitle-1 font-weight-bold">{{ product.producto.nombre }}</p>
        <p class="text-body-2 text-medium-emphasis mb-5">{{ money(Number(product.precioVenta)) }} por kg</p>
        <v-text-field
          v-model="grams" label="Peso en gramos" suffix="g" placeholder="Ej. 250"
          inputmode="numeric" variant="outlined" autofocus autocomplete="off"
          :disabled="disabled" :error-messages="grams ? issue : ''"
          hint="Escribe el peso que indica la balanza." persistent-hint
          @keydown.enter.prevent="confirm"
        />
        <div class="d-flex flex-wrap ga-2 mt-3 mb-5">
          <v-btn v-for="weight in [250, 500, 1000]" :key="weight" variant="tonal" :disabled="disabled" @click="grams = String(weight)">{{ weight }} g</v-btn>
        </div>
        <p v-if="available !== null" class="text-body-2 text-medium-emphasis mb-3">Disponible: {{ quantityInputValue(Math.max(0, available), 'KG') }} g</p>
        <div class="d-flex justify-space-between align-center text-h6">
          <span>Importe</span><strong class="text-primary">{{ money(amount * Number(product.precioVenta)) }}</strong>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn @click="open = false">Cancelar</v-btn><v-spacer />
        <v-btn color="primary" variant="flat" :disabled="disabled || !grams || !!issue || !product" @click="confirm">Agregar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ProductoSucursal } from '@/modules/logistica/logistica.types'
import { parseQuantityInput, quantityInputValue } from '@/shared/utils/product-quantity'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{
  product: ProductoSucursal | null
  available: number | null
  disabled: boolean
  validate: (quantity: number) => string
}>()
const emit = defineEmits<{ agregar: [quantity: number] }>()
const grams = ref('')
const parsed = computed(() => parseQuantityInput(grams.value, 'KG'))
const amount = computed(() => parsed.value.ok ? parsed.value.quantity : 0)
const issue = computed(() => parsed.value.ok ? props.validate(parsed.value.quantity) : parsed.value.error)
watch([open, () => props.product?.idProductoSucursal], () => { grams.value = '' })
function money(value: number) { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value) }
function confirm() {
  if (open.value && props.product && !props.disabled && parsed.value.ok && !issue.value) emit('agregar', parsed.value.quantity)
}
</script>
