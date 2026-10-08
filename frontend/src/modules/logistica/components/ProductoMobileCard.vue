<template>
  <v-card variant="outlined" rounded="lg" class="product-mobile-card">
    <v-card-text class="pa-4">
      <div class="d-flex align-start ga-3">
        <v-avatar size="48" rounded="lg" color="primary" variant="tonal">
          <v-img v-if="producto.imagen" :src="producto.imagen" cover :alt="producto.nombre"><template #error><v-icon>mdi-package-variant</v-icon></template></v-img>
          <v-icon v-else>mdi-package-variant</v-icon>
        </v-avatar>
        <div class="flex-grow-1 min-w-0">
          <div class="product-mobile-name">{{ producto.nombre }}</div>
          <div class="text-caption text-medium-emphasis mt-1">#{{ producto.idProducto }} · {{ producto.tipoProducto?.nombre }}</div>
        </div>
        <v-menu v-if="canManage" location="bottom end">
          <template #activator="{ props }"><v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" :aria-label="`Acciones de ${producto.nombre}`" /></template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-pencil-outline" title="Editar producto" @click="emit('editar', producto)" />
            <v-list-item prepend-icon="mdi-delete-outline" title="Eliminar producto" base-color="error" @click="emit('eliminar', producto)" />
          </v-list>
        </v-menu>
      </div>
      <div class="d-flex flex-wrap ga-2 mt-3">
        <v-chip size="small" variant="tonal" :color="producto.categoria?.color || 'primary'">{{ producto.categoria?.nombre }}</v-chip>
        <v-chip size="small" variant="outlined">{{ producto.unidadMedida?.simbolo }}</v-chip>
        <v-chip size="small" variant="tonal" :color="producto.estado ? 'success' : 'error'">{{ producto.estado ? 'Activo' : 'Inactivo' }}</v-chip>
      </div>
      <div class="product-mobile-actions mt-4">
        <v-btn variant="tonal" color="primary" prepend-icon="mdi-camera-plus-outline" @click="emit('fotos', producto)">Fotos</v-btn>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-store-outline" @click="emit('sucursal', producto)">Sucursal</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Producto } from '../logistica.types'
defineProps<{ producto: Producto; canManage: boolean }>()
const emit = defineEmits<{ fotos: [producto: Producto]; sucursal: [producto: Producto]; editar: [producto: Producto]; eliminar: [producto: Producto] }>()
</script>

<style scoped>
.product-mobile-card { height: 100%; }
.product-mobile-name { font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.product-mobile-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.v-chip { max-width: 100%; }
</style>
