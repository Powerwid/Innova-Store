<template>
  <div class="payment-methods-page">
    <v-card class="mb-3 rounded-xl" elevation="1" border>
      <v-card-text class="d-flex flex-wrap align-center justify-space-between ga-3 pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-credit-card-outline" color="primary" size="24" class="me-2" />
          <span class="text-h6 font-weight-bold">Medios de Pago</span>
        </div>
        <v-btn v-if="canCreate" prepend-icon="mdi-plus" color="primary" variant="tonal" rounded="lg" @click="openCreate">
          Nuevo Medio de Pago
        </v-btn>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-3" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-card class="rounded-xl overflow-hidden" elevation="1" border>
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="44" />
      </div>
      <template v-else-if="mediosPago.length">
        <div class="payment-mobile-list pa-3">
          <v-card v-for="medio in mediosPago" :key="medio.idMedioPago" class="mb-3 rounded-lg" variant="outlined">
            <v-card-text class="d-flex align-center ga-3 pa-3">
              <v-avatar color="primary" variant="tonal" size="40"><v-icon icon="mdi-credit-card-outline" /></v-avatar>
              <div class="flex-grow-1 min-w-0">
                <div class="font-weight-medium text-truncate">{{ medio.nombre }}</div>
                <div class="text-caption text-medium-emphasis">ID: {{ medio.idMedioPago }}</div>
              </div>
              <div class="d-flex align-center">
                <v-btn v-if="canEdit" icon="mdi-pencil" size="small" variant="text" color="warning"
                  :aria-label="`Editar ${medio.nombre}`" @click="openEdit(medio)" />
                <v-btn v-if="canDelete" icon="mdi-delete" size="small" variant="text" color="error"
                  :aria-label="`Eliminar ${medio.nombre}`" @click="confirmDelete(medio)" />
              </div>
            </v-card-text>
          </v-card>
        </div>
        <v-table class="payment-desktop-list" hover>
          <thead class="payment-table-head"><tr>
            <th style="width: 100px">ID</th>
            <th>Medio de Pago</th>
            <th class="text-end" style="width: 140px">Acciones</th>
          </tr></thead>
          <tbody><tr v-for="medio in mediosPago" :key="medio.idMedioPago">
            <td>{{ medio.idMedioPago }}</td>
            <td class="font-weight-medium">{{ medio.nombre }}</td>
            <td class="text-end">
              <v-btn v-if="canEdit" icon="mdi-pencil" size="small" variant="text" color="primary"
                :aria-label="`Editar ${medio.nombre}`" @click="openEdit(medio)" />
              <v-btn v-if="canDelete" icon="mdi-delete" size="small" variant="text" color="error"
                :aria-label="`Eliminar ${medio.nombre}`" @click="confirmDelete(medio)" />
            </td>
          </tr></tbody>
        </v-table>
      </template>
      <div v-else class="text-center text-medium-emphasis py-12">No se encontraron medios de pago</div>
    </v-card>

    <v-dialog v-model="dialog" max-width="450" persistent>
      <v-card rounded="xl">
        <v-card-title class="payment-dialog-title pa-4">{{ editing ? 'Editar Medio de Pago' : 'Nuevo Medio de Pago' }}</v-card-title>
        <v-card-text class="pa-4">
          <v-alert v-if="dialogError" type="error" variant="tonal" density="compact" class="mb-3">{{ dialogError }}</v-alert>
          <label class="payment-field-label" for="payment-name">Nombre del medio de pago *</label>
          <v-text-field id="payment-name" v-model="nombre" placeholder="Ej.: Efectivo, Yape, Plin"
            variant="outlined" density="comfortable" maxlength="45" :error-messages="nameError"
            @update:model-value="nameError = ''; dialogError = ''" @keyup.enter="save" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 justify-end">
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="430">
      <v-card rounded="xl">
        <v-card-title class="pa-4">Eliminar medio de pago</v-card-title>
        <v-card-text>¿Eliminar «{{ deleting?.nombre }}»?</v-card-text>
        <v-card-actions class="pa-4 justify-end">
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" :loading="saving" @click="remove">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="noticeVisible" color="success">{{ notice }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { mediosPagoApi } from '@/core/api/administracion.api';
import { getApiErrorMessage } from '@/core/api/api-error';
import { Permiso } from '@/core/constants/permisos';
import type { MedioPago } from '@/core/types/administracion.types';
import { useAuthStore } from '@/modules/auth/auth.store';

const auth = useAuthStore();
const canManage = computed(() => auth.puede(Permiso.MEDIOS_PAGO_GESTIONAR));
const canCreate = canManage;
const canEdit = canManage;
const canDelete = canManage;
const mediosPago = ref<MedioPago[]>([]);
const loading = ref(true);
const saving = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const editing = ref<MedioPago | null>(null);
const deleting = ref<MedioPago | null>(null);
const nombre = ref('');
const error = ref('');
const dialogError = ref('');
const nameError = ref('');
const notice = ref('');
const noticeVisible = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await mediosPagoApi.listar();
    mediosPago.value = data;
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'No se pudieron cargar los medios de pago');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  nombre.value = '';
  dialogError.value = '';
  nameError.value = '';
  dialog.value = true;
}

function openEdit(medio: MedioPago) {
  editing.value = medio;
  nombre.value = medio.nombre;
  dialogError.value = '';
  nameError.value = '';
  dialog.value = true;
}

async function save() {
  const value = nombre.value.trim();
  nameError.value = '';
  if (!value) {
    nameError.value = 'Ingresa el nombre del medio de pago';
    dialogError.value = 'Revisa el campo resaltado';
    return;
  }
  if (value.length > 45) {
    nameError.value = 'El nombre no puede superar los 45 caracteres';
    dialogError.value = 'Revisa el campo resaltado';
    return;
  }
  saving.value = true;
  dialogError.value = '';
  try {
    const response = editing.value
      ? await mediosPagoApi.actualizar(editing.value.idMedioPago, value)
      : await mediosPagoApi.crear(value);
    dialog.value = false;
    notice.value = response.data.message;
    noticeVisible.value = true;
    await load();
  } catch (cause) {
    dialogError.value = getApiErrorMessage(cause, 'No se pudo guardar el medio de pago');
  } finally {
    saving.value = false;
  }
}

function confirmDelete(medio: MedioPago) {
  deleting.value = medio;
  deleteDialog.value = true;
}

async function remove() {
  if (!deleting.value) return;
  saving.value = true;
  error.value = '';
  try {
    const { data } = await mediosPagoApi.eliminar(deleting.value.idMedioPago);
    deleteDialog.value = false;
    deleting.value = null;
    notice.value = data.message;
    noticeVisible.value = true;
    await load();
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'No se pudo eliminar el medio de pago');
    deleteDialog.value = false;
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.payment-methods-page { max-width: 1600px; margin: 0 auto; }
.payment-field-label { display: block; margin-bottom: 6px; font-size: 0.875rem; font-weight: 500; }
.payment-table-head, .payment-dialog-title {
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
}
.payment-table-head th { color: inherit !important; }
.payment-mobile-list { display: none; }
@media (max-width: 767px) {
  .payment-mobile-list { display: block; }
  .payment-desktop-list { display: none; }
}
</style>
