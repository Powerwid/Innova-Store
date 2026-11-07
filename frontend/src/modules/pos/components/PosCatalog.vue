<template>
  <v-card border rounded="lg" elevation="0" class="pos-catalog">
    <div class="pos-catalog-tools border-b">
      <div class="d-flex align-center ga-2">
        <v-chip variant="tonal" prepend-icon="mdi-package-variant-closed"
          >Disponibles</v-chip
        ><v-btn
          v-if="canRecognize"
          variant="text"
          color="primary"
          icon="mdi-image-search-outline"
          aria-label="Reconocer por foto"
          :disabled="!canEdit || !hasWarehouse"
          @click="emit('recognize')"
        />
      </div>
      <v-text-field
        v-model="search"
        placeholder="Buscar producto o código..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        aria-label="Buscar productos"
        @keyup.enter="emit('barcode')"
      />
      <v-btn
        icon="mdi-refresh"
        variant="text"
        aria-label="Actualizar productos y caja"
        :loading="loading"
        @click="emit('refresh')"
      />
    </div>
    <div class="pos-categories border-b">
      <v-chip-group
        v-model="categoryId"
        mandatory
        selected-class="text-primary"
        show-arrows
        ><v-chip :value="0" variant="tonal" rounded="lg" filter>Todos</v-chip
        ><v-chip
          v-for="category in categories"
          :key="category.idCategoria"
          :value="category.idCategoria"
          variant="tonal"
          rounded="lg"
          filter
          ><span
            class="pos-category-dot"
            :style="{
              background: category.color || 'rgb(var(--v-theme-primary))',
            }"
          />{{ category.nombre }}</v-chip
        ></v-chip-group
      >
    </div>
    <div class="pos-products-scroll">
      <div v-if="loading" class="pos-product-grid">
        <v-skeleton-loader
          v-for="index in 8"
          :key="index"
          type="image, list-item-two-line"
        />
      </div>
      <div v-else-if="filteredProducts.length" class="pos-product-grid">
        <button
          v-for="product in filteredProducts"
          :key="product.idProductoSucursal"
          type="button"
          class="pos-product-card"
          :disabled="!canAdd(product)"
          :aria-label="`Agregar ${product.producto.nombre}, ${money(product.precioVenta)}`"
          @click="emit('add', product)"
        >
          <div
            class="pos-stock-band"
            :class="
              !hasWarehouse || stockFor(product.idProductoSucursal) <= 0 ||
              Number(product.precioVenta) <= 0
                ? 'pos-stock-empty'
                : ''
            "
          >
            {{
              !hasWarehouse
                ? 'Sin almacén'
                : Number(product.precioVenta) <= 0
                  ? 'Sin precio'
                  : stockFor(product.idProductoSucursal) <= 0
                    ? 'Sin stock'
                    : `Stock: ${quantityLabel(stockFor(product.idProductoSucursal))} ${product.producto.unidadMedida.simbolo}`
            }}
          </div>
          <div class="pos-product-image">
            <v-img
              v-if="product.producto.imagen"
              :src="product.producto.imagen"
              cover
              height="100%"
              ><template #error
                ><div class="pos-product-placeholder">
                  <v-icon size="36">mdi-package-variant-closed</v-icon>
                </div></template
              ></v-img
            >
            <div v-else class="pos-product-placeholder">
              <v-icon size="36">mdi-package-variant-closed</v-icon>
            </div>
            <span class="pos-product-price">{{
              money(product.precioVenta)
            }}<span v-if="usesGrams(product.producto.unidadMedida.simbolo)"> / kg</span></span
            ><span
              v-if="quantityInCart(product.idProductoSucursal)"
              class="pos-in-cart"
            >{{ quantityInputValue(quantityInCart(product.idProductoSucursal), product.producto.unidadMedida.simbolo) }} {{ quantityInputUnit(product.producto.unidadMedida.simbolo) }} en carrito</span
            >
          </div>
          <div class="pos-product-info">
            <div class="pos-product-name">{{ product.producto.nombre }}</div>
            <div class="pos-product-meta">
              <span>{{ product.producto.unidadMedida.simbolo }}</span
              ><span
                :class="
                  stockFor(product.idProductoSucursal) <= 0
                    ? 'text-error'
                    : 'text-success'
                "
                >{{
                  hasWarehouse
                    ? `${quantityLabel(stockFor(product.idProductoSucursal))} disponibles`
                    : 'Sin almacén'
                }}</span
              >
            </div>
            <div
              v-if="Number(product.precioVenta) <= 0"
              class="text-caption text-error mt-1"
            >
              Sin precio de venta
            </div>
          </div>
        </button>
      </div>
      <div v-else class="pos-catalog-empty">
        <v-icon size="50" color="medium-emphasis"
          >mdi-package-variant-closed</v-icon
        >
        <h2 class="text-subtitle-1 mt-3">
          {{
            error
              ? 'No se pudo cargar el catálogo'
              : 'No se encontraron productos'
          }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mt-1">
          {{
            search || categoryId
              ? 'Prueba con otro nombre, código o categoría.'
              : 'Asigna productos activos a esta sucursal para empezar.'
          }}
        </p>
        <v-btn
          v-if="search || categoryId"
          variant="tonal"
          color="primary"
          class="mt-4"
          @click="clearFilters"
          >Limpiar filtros</v-btn
        >
      </div>
    </div>
  </v-card>
</template>
<script setup lang="ts">
import type { ProductoSucursal } from '@/modules/logistica/logistica.types'
import { quantityInputUnit, quantityInputValue, usesGrams } from '@/shared/utils/product-quantity'
const search = defineModel<string>('search', { required: true })
const categoryId = defineModel<number>('categoryId', { required: true })
defineProps<{
  filteredProducts: ProductoSucursal[]
  categories: ProductoSucursal['producto']['categoria'][]
  loading: boolean
  error: string
  canEdit: boolean
  canRecognize: boolean
  hasWarehouse: boolean
  stockFor: (id: number) => number
  quantityInCart: (id: number) => number
  canAdd: (product: ProductoSucursal) => boolean
}>()
const emit = defineEmits<{
  add: [product: ProductoSucursal]
  refresh: []
  recognize: []
  barcode: []
}>()
function money(value: string | number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0)
}
function quantityLabel(value: number) {
  return Math.round(value * 1000) / 1000
}
function clearFilters() {
  search.value = ''
  categoryId.value = 0
}
</script>
