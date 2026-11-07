<template>
  <div class="pos-quantity" :class="{ 'pos-quantity-weight': grams }">
    <v-btn
      icon="mdi-minus" size="small" variant="tonal" :disabled="disabled"
      :aria-label="`Reducir ${grams ? '100 gramos' : 'cantidad'} de ${name}`"
      :title="grams ? 'Restar 100 g' : 'Restar 1'" @click="adjust(-1)"
    />
    <input
      v-model="text" type="text" :inputmode="grams ? 'numeric' : 'decimal'"
      :aria-label="`${grams ? 'Gramos' : 'Cantidad'} de ${name}`" :disabled="disabled"
      autocomplete="off" @focus="selectText" @change="commit" @keydown.enter.prevent="blurInput"
    />
    <span class="pos-quantity-unit">{{ quantityInputUnit(unit) }}</span>
    <v-btn
      icon="mdi-plus" size="small" variant="tonal" color="primary" :disabled="disabled"
      :aria-label="`Aumentar ${grams ? '100 gramos' : 'cantidad'} de ${name}`"
      :title="grams ? 'Sumar 100 g' : 'Sumar 1'" @click="adjust(1)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { parseQuantityInput, quantityInputUnit, quantityInputValue, quantityStep, usesGrams } from '@/shared/utils/product-quantity'

const props = defineProps<{ quantity: number; unit: string; name: string; disabled?: boolean }>()
const emit = defineEmits<{
  change: [quantity: number]
  adjust: [step: number]
  invalid: [message: string]
}>()
const text = ref('')
const grams = computed(() => usesGrams(props.unit))
function resetText() { text.value = quantityInputValue(props.quantity, props.unit) }
watch([() => props.quantity, () => props.unit], resetText, { immediate: true })
function commit() {
  if (props.disabled) { resetText(); return }
  const parsed = parseQuantityInput(text.value, props.unit)
  if (parsed.ok) emit('change', parsed.quantity)
  else emit('invalid', parsed.error)
  // El padre puede rechazar la cantidad si cambió el stock.
  void nextTick(resetText)
}
function adjust(direction: number) {
  if (!props.disabled) emit('adjust', direction * quantityStep(props.unit))
}
function selectText(event: FocusEvent) { (event.target as HTMLInputElement).select() }
function blurInput(event: KeyboardEvent) { (event.target as HTMLInputElement).blur() }
</script>
