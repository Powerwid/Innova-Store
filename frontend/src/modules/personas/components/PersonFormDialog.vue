<template>
  <v-dialog :model-value="modelValue" max-width="720" persistent @update:model-value="close">
    <v-card class="person-form-card rounded-xl" elevation="24">
      <v-card-item class="person-form-header pa-3 pa-sm-5">
        <template #prepend>
          <v-avatar color="rgba(255,255,255,0.2)" size="48" class="me-3">
            <v-icon color="white" size="25">{{ editing ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
          </v-avatar>
        </template>
        <v-card-title class="text-white font-weight-bold text-h6">
          {{ editing ? 'Editar' : 'Nuevo' }} {{ roleLabel }}
        </v-card-title>
        <v-card-subtitle class="text-white opacity-90 d-none d-sm-block">
          Completa los datos del registro
        </v-card-subtitle>
        <template #append>
          <v-btn icon="mdi-close" color="white" variant="text" :disabled="saving" @click="close" />
        </template>
      </v-card-item>

      <v-card-text class="person-form-body pa-4 pa-sm-6">
        <v-alert
          v-if="errorMessage"
          color="error"
          variant="tonal"
          density="compact"
          closable
          class="mb-4"
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <v-form ref="formRef" v-model="formValid" @submit.prevent="save">
          <section>
            <div class="form-section-title">
              <v-icon size="20" color="primary">mdi-card-account-details-outline</v-icon>
              Documento
            </div>
            <div class="document-grid">
              <v-select
                v-model="form.idTipoDocumento"
                :items="documentTypes"
                item-title="nombre"
                item-value="idTipoDocumento"
                label="Tipo de documento"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="[requiredRule]"
                @update:model-value="changeDocumentType"
              />
              <v-text-field
                v-model="form.numeroDocumento"
                label="Número de documento"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :maxlength="documentMaxLength"
                :rules="documentRules"
                :inputmode="selectedDocumentType?.nombre === 'CE' ? 'text' : 'numeric'"
                @update:model-value="sanitizeDocument"
                @keyup.enter="lookupDocument"
              >
                <template #append-inner>
                  <v-btn
                    v-if="canLookupDocument"
                    icon="mdi-magnify"
                    variant="text"
                    color="primary"
                    size="small"
                    :loading="lookupLoading"
                    :disabled="!documentReady"
                    aria-label="Consultar documento"
                    @click="lookupDocument"
                  />
                </template>
              </v-text-field>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section-title">
              <v-icon color="primary" size="20">{{ role === 'CLIENTE' ? 'mdi-account-outline' : 'mdi-truck-outline' }}</v-icon>
              {{ role === 'CLIENTE' ? 'Cliente' : 'Proveedor' }}
            </div>
            <v-text-field
              v-model="form.nombre"
              :label="role === 'CLIENTE' ? 'Nombre o razón social' : 'Razón social'"
              variant="outlined"
              density="compact"
              hide-details="auto"
              maxlength="255"
              :rules="nameRules"
              @blur="form.nombre = formatName(form.nombre)"
            />
          </section>

          <section class="form-section">
            <div class="form-section-title">
              <v-icon color="primary" size="20">mdi-phone-outline</v-icon>
              Datos opcionales
            </div>
            <div class="optional-grid">
              <v-text-field
                v-model="form.correo"
                label="Correo electrónico"
                type="email"
                variant="outlined"
                density="compact"
                hide-details="auto"
                maxlength="255"
                :rules="emailRules"
              />
              <v-text-field
                v-model="form.telefono"
                label="Teléfono"
                variant="outlined"
                density="compact"
                hide-details="auto"
                maxlength="20"
              />
            </div>
            <v-text-field
              v-model="form.direccion"
              label="Dirección"
              variant="outlined"
              density="compact"
              hide-details="auto"
              maxlength="255"
              class="mt-2"
            />
          </section>

          <section class="form-section form-status">
            <div>
              <div class="font-weight-bold">Estado</div>
              <div class="text-caption text-medium-emphasis">Controla si el registro puede utilizarse.</div>
            </div>
            <v-switch v-model="form.activo" color="primary" inset hide-details />
          </section>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4 border-t">
        <v-spacer />
        <v-btn :disabled="saving" @click="close">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          min-width="130"
          :loading="saving"
          :disabled="!formValid"
          @click="save"
        >
          {{ editing ? 'Actualizar' : 'Guardar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { documentosApi, personasApi } from '@/core/api/administracion.api'
import { getApiErrorMessage } from '@/core/api/api-error'
import type { PersonaPayload, PersonaRegistro, TipoDocumento, TipoPersona } from '@/core/types/administracion.types'

const props = defineProps<{
  modelValue: boolean
  role: TipoPersona
  person: Partial<PersonaRegistro> | null
  documentTypes: TipoDocumento[]
  idSucursal: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [message: string]
}>()

const emptyForm = () => ({
  nombre: '',
  idTipoDocumento: null as number | null,
  numeroDocumento: '',
  direccion: '',
  ubigeo: '',
  correo: '',
  telefono: '',
  activo: true,
})

const formRef = ref()
const formValid = ref(false)
const lookupLoading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const form = reactive(emptyForm())

const editing = computed(() => Boolean(props.person?.id))
const roleLabel = computed(() => props.role === 'CLIENTE' ? 'cliente' : 'proveedor')
const selectedDocumentType = computed(() => props.documentTypes.find((item) => item.idTipoDocumento === form.idTipoDocumento) ?? null)
const documentMaxLength = computed(() => selectedDocumentType.value?.nombre === 'DNI' ? 8 : selectedDocumentType.value?.nombre === 'RUC' ? 11 : 20)
const canLookupDocument = computed(() => ['DNI', 'RUC'].includes(selectedDocumentType.value?.nombre || ''))
const documentReady = computed(() => {
  const tipo = selectedDocumentType.value?.nombre
  if (tipo === 'DNI') return /^\d{8}$/.test(form.numeroDocumento)
  if (tipo === 'RUC') return /^\d{11}$/.test(form.numeroDocumento)
  return /^[A-Z0-9]{6,20}$/.test(form.numeroDocumento)
})

const requiredRule = (value: unknown) => (value !== null && value !== undefined && value !== '') || 'Este campo es obligatorio'
const nameRules = [requiredRule, (value: string) => value?.trim().length >= 3 || 'Debe contener al menos 3 caracteres']
const documentRules = [requiredRule, () => documentReady.value || 'El número no corresponde al tipo de documento']
const emailRules = [(value: string) => !value || /^\S+@\S+\.\S+$/.test(value) || 'Correo electrónico no válido']

function reset() {
  Object.assign(form, props.person ? {
    nombre: props.person.nombre || '',
    idTipoDocumento: props.person.idTipoDocumento ?? null,
    numeroDocumento: props.person.numeroDocumento || '',
    direccion: props.person.direccion || '',
    ubigeo: props.person.ubigeo || '',
    correo: props.person.correo || '',
    telefono: props.person.telefono || '',
    activo: props.person.activo ?? true,
  } : emptyForm())
  if (!props.person) {
    form.idTipoDocumento = props.documentTypes.find((item) => item.nombre === 'DNI')?.idTipoDocumento ?? props.documentTypes[0]?.idTipoDocumento ?? null
  }
  errorMessage.value = ''
  formRef.value?.resetValidation()
}

function close() {
  if (!saving.value) emit('update:modelValue', false)
}

function changeDocumentType() {
  form.numeroDocumento = ''
  if (!editing.value) form.nombre = ''
}

function sanitizeDocument(value: string) {
  const raw = String(value || '').toUpperCase()
  form.numeroDocumento = selectedDocumentType.value?.nombre === 'CE'
    ? raw.replace(/[^A-Z0-9]/g, '').slice(0, documentMaxLength.value)
    : raw.replace(/\D/g, '').slice(0, documentMaxLength.value)
}

function formatName(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-PE')
    .replace(/(^|[\s.'/-])(\p{L})/gu, (_match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase('es-PE')}`)
}

async function lookupDocument() {
  const tipo = selectedDocumentType.value?.nombre
  if ((tipo !== 'DNI' && tipo !== 'RUC') || !documentReady.value || lookupLoading.value) return
  lookupLoading.value = true
  errorMessage.value = ''
  try {
    const { data } = await documentosApi.consultar(tipo, form.numeroDocumento)
    form.nombre = formatName(data.tipoDocumento === 'DNI' ? data.nombreCompleto : data.razonSocial)
    if (data.tipoDocumento === 'RUC') {
      form.direccion = data.direccion || ''
      form.ubigeo = data.ubigeo || ''
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'No se encontró el documento. Puedes ingresar los datos manualmente.')
  } finally {
    lookupLoading.value = false
  }
}

async function save() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid || saving.value) return
  if (props.role === 'PROVEEDOR' && !props.idSucursal) {
    errorMessage.value = 'Debe seleccionar una sucursal para registrar proveedores'
    return
  }

  saving.value = true
  errorMessage.value = ''
  const payload: PersonaPayload = {
    nombre: formatName(form.nombre),
    idTipoDocumento: Number(form.idTipoDocumento),
    numeroDocumento: form.numeroDocumento,
    direccion: form.direccion.trim() || null,
    ubigeo: form.ubigeo.trim() || null,
    correo: form.correo.trim() || null,
    telefono: form.telefono.trim() || null,
    activo: form.activo,
    ...(props.role === 'PROVEEDOR' && !editing.value ? { idSucursal: Number(props.idSucursal) } : {}),
  }

  try {
    const { data } = editing.value
      ? await personasApi.actualizar(props.role, props.person!.id!, payload)
      : await personasApi.crear({ ...payload, tipo: props.role })
    emit('saved', data.message)
    emit('update:modelValue', false)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'No se pudo guardar el registro')
  } finally {
    saving.value = false
  }
}

watch(() => props.modelValue, (open) => { if (open) reset() })
watch(() => props.person, () => { if (props.modelValue) reset() })
</script>

<style scoped>
.person-form-card { max-height: calc(100vh - 32px); display: flex; flex-direction: column; overflow: hidden; }
.person-form-header { flex: 0 0 auto; background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-primary-darken-1))); }
.person-form-body { min-height: 0; overflow-y: auto; scrollbar-gutter: stable; }
.form-section { margin-top: 18px; padding-top: 18px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.form-section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 1rem; font-weight: 700; }
.document-grid { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 12px; }
.optional-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.form-status { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
@media (max-width: 600px) {
  .document-grid, .optional-grid { grid-template-columns: 1fr; }
  .person-form-header :deep(.v-avatar) { width: 38px !important; height: 38px !important; }
}
</style>
