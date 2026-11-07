<template>
  <v-dialog v-model="open" max-width="560" scrollable :persistent="saving">
    <v-card rounded="xl">
      <v-card-title class="logistica-dialog-title">
        <span class="logistica-dialog-icon"><v-icon icon="mdi-image-outline" /></span>
        Foto del producto
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="on-primary" aria-label="Cerrar foto del producto" :disabled="saving" @click="open = false" />
      </v-card-title>
      <v-card-text class="pa-5">
        <div class="font-weight-bold mb-4">{{ producto?.nombre }}</div>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
        <v-img v-if="!file && producto?.imagen && !removeImage" :src="producto.imagen" :alt="producto.nombre" height="220" contain class="rounded-lg mb-4">
          <template #error><v-icon size="48">mdi-image-off-outline</v-icon></template>
        </v-img>
        <div v-else-if="!file" class="text-center text-medium-emphasis py-6 mb-3">
          <v-icon icon="mdi-image-outline" size="48" class="mb-2" />
          <div>{{ removeImage ? 'Se quitará la foto al guardar.' : 'Este producto todavía no tiene foto.' }}</div>
        </div>
        <CapturaProducto v-if="open" v-model="file" :disabled="saving" />
        <v-btn v-if="producto?.imagen && !file && !removeImage" color="error" variant="text" prepend-icon="mdi-image-remove-outline" class="mt-3" :disabled="saving" @click="removeImage = true">Quitar foto actual</v-btn>
        <v-btn v-else-if="removeImage && !file" variant="text" class="mt-3" :disabled="saving" @click="removeImage = false">Conservar foto actual</v-btn>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn variant="text" :disabled="saving" @click="open = false">Cancelar</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save-outline" :loading="saving" :disabled="!producto || (!file && !removeImage)" @click="save">Guardar foto</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getApiErrorMessage } from '@/core/api/api-error'
import CapturaProducto from '@/modules/reconocimiento/components/CapturaProducto.vue'
import { productosApi } from '../logistica.api'
import type { Producto } from '../logistica.types'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ producto: Producto | null }>()
const emit = defineEmits<{ actualizado: [producto: Producto] }>()
const file = ref<File | null>(null)
const saving = ref(false)
const removeImage = ref(false)
const error = ref('')

watch([open, () => props.producto?.idProducto], () => {
  file.value = null
  removeImage.value = false
  error.value = ''
})

async function save() {
  const id = props.producto?.idProducto
  const photo = file.value
  if (!id || saving.value || (!photo && !removeImage.value)) return
  saving.value = true
  error.value = ''
  try {
    const response = photo
      ? await productosApi.subirImagen(id, photo)
      : await productosApi.actualizar(id, { imagen: null })
    if (props.producto?.idProducto !== id || !open.value) return
    emit('actualizado', response.data)
    open.value = false
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'No se pudo guardar la foto del producto.')
  } finally {
    saving.value = false
  }
}
</script>
