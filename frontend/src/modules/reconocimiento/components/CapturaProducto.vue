<template>
  <div>
    <v-file-input :model-value="file" label="Foto del producto" accept="image/jpeg,image/png,image/webp" prepend-icon="" prepend-inner-icon="mdi-image-outline" variant="outlined" density="comfortable" :disabled="disabled || cameraOpening" :error-messages="error" hint="JPG, PNG o WebP · máximo 8 MB" persistent-hint @update:model-value="selectFile" />
    <div class="d-flex flex-wrap ga-2 mt-2">
      <v-btn v-if="!stream" variant="tonal" color="primary" prepend-icon="mdi-camera-outline" :disabled="disabled" :loading="cameraOpening" @click="openCamera">Usar cámara</v-btn>
      <template v-else>
        <v-btn color="primary" prepend-icon="mdi-camera" :disabled="disabled || !cameraReady" @click="capture">Tomar foto</v-btn>
        <v-btn variant="text" @click="stopCamera">Cerrar cámara</v-btn>
      </template>
    </div>
    <video v-show="stream" ref="video" autoplay muted playsinline class="capture-preview mt-3" aria-label="Vista de la cámara" @loadedmetadata="cameraReady = true" />
    <v-img v-if="preview && !stream" :src="preview" max-height="240" contain class="mt-3 rounded-lg bg-grey-lighten-4" alt="Foto seleccionada" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { validarImagen } from '../imagen'

const file = defineModel<File | null>({ required: true })
const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
const error = ref('')
const preview = ref('')
const video = ref<HTMLVideoElement | null>(null)
const stream = shallowRef<MediaStream | null>(null)
const cameraOpening = ref(false)
const cameraReady = ref(false)
let cameraRequest = 0
let disposed = false

function stopCamera() {
  cameraRequest++
  stream.value?.getTracks().forEach(track => track.stop())
  stream.value = null
  if (video.value) video.value.srcObject = null
  cameraReady.value = cameraOpening.value = false
}

function selectFile(value: File | File[] | null | undefined) {
  stopCamera()
  const selected = Array.isArray(value) ? value[0] : value
  error.value = selected ? validarImagen(selected) : ''
  file.value = error.value ? null : selected ?? null
}

async function openCamera() {
  error.value = ''
  if (!navigator.mediaDevices?.getUserMedia) { error.value = 'La cámara necesita HTTPS o localhost. También puedes subir una foto.'; return }
  file.value = null
  const request = ++cameraRequest
  cameraOpening.value = true
  try {
    const opened = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
    if (disposed || request !== cameraRequest) { opened.getTracks().forEach(track => track.stop()); return }
    stream.value = opened
    await nextTick()
    if (video.value) { video.value.srcObject = opened; await video.value.play() }
  } catch {
    if (request === cameraRequest && !disposed) { stopCamera(); error.value = 'No se pudo abrir la cámara. Revisa el permiso del navegador o sube una foto.' }
  } finally { if (request === cameraRequest) cameraOpening.value = false }
}

async function capture() {
  const source = video.value
  if (!source?.videoWidth || !source.videoHeight || props.disabled) return
  const request = cameraRequest
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, 1600 / Math.max(source.videoWidth, source.videoHeight))
  canvas.width = Math.round(source.videoWidth * scale)
  canvas.height = Math.round(source.videoHeight * scale)
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (request !== cameraRequest || disposed) return
  if (!blob) { error.value = 'No se pudo tomar la foto. Intenta de nuevo.'; return }
  selectFile(new File([blob], 'producto.jpg', { type: 'image/jpeg' }))
}

watch(file, value => {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = value ? URL.createObjectURL(value) : ''
}, { immediate: true })
onBeforeUnmount(() => { disposed = true; stopCamera(); if (preview.value) URL.revokeObjectURL(preview.value) })
</script>

<style scoped>
.capture-preview { width: 100%; max-height: 280px; border-radius: 12px; background: #111; object-fit: contain; }
</style>
