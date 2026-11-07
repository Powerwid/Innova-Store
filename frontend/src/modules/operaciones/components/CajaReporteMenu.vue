<template>
  <v-menu v-model="menu" location="bottom end">
    <template #activator="{ props }">
      <v-btn v-bind="props" :icon="compact" :prepend-icon="compact ? undefined : 'mdi-printer-outline'" :size="compact ? 'small' : 'default'" color="primary" variant="text" :loading="!!exporting" :disabled="!!exporting" :aria-label="`Reporte de caja ${idCaja}`"><v-icon v-if="compact" icon="mdi-printer-outline" /><span v-else>Reporte</span></v-btn>
    </template>
    <v-list min-width="210">
      <v-list-subheader>Reporte de caja #{{ idCaja }}</v-list-subheader>
      <v-list-item v-for="format in formats" :key="format.value" :prepend-icon="format.icon" :title="format.title" @click="download(format.value)" />
    </v-list>
  </v-menu>
  <v-snackbar v-model="notice.show" :color="notice.color">{{ notice.message }}</v-snackbar>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { isAxiosError } from 'axios'
import { getApiErrorMessage } from '@/core/api/api-error'
import type { FormatoReporte } from '@/modules/reportes/reportes.api'
import { cajasApi } from '../operaciones.api'
const props = withDefaults(defineProps<{ idCaja: number; compact?: boolean }>(), { compact: false })
const menu = ref(false), exporting = ref<FormatoReporte | null>(null)
const notice = reactive({ show: false, message: '', color: 'success' })
const formats: Array<{ value: FormatoReporte; title: string; icon: string }> = [
  { value: 'ticket', title: 'Ticket (80 mm)', icon: 'mdi-receipt-text-outline' },
  { value: 'excel', title: 'Excel', icon: 'mdi-microsoft-excel' },
  { value: 'pdf', title: 'PDF A4', icon: 'mdi-file-pdf-box' },
]
async function download(format: FormatoReporte) {
  if (exporting.value) return
  const id = props.idCaja
  menu.value = false; exporting.value = format
  try {
    const { data } = await cajasApi.exportarReporte(id, format)
    const url = URL.createObjectURL(data), link = document.createElement('a')
    link.href = url; link.download = `caja-${id}-${format}.${format === 'excel' ? 'xlsx' : 'pdf'}`
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    Object.assign(notice, { show: true, message: 'Reporte de caja descargado.', color: 'success' })
  } catch (error) {
    let message = getApiErrorMessage(error, 'No se pudo generar el reporte de caja.')
    if (isAxiosError(error) && error.response?.data instanceof Blob) {
      try { const body = JSON.parse(await error.response.data.text()); if (typeof body.message === 'string') message = body.message } catch { /* Conserva el mensaje general. */ }
    }
    Object.assign(notice, { show: true, message, color: 'error' })
  } finally { exporting.value = null }
}
</script>
