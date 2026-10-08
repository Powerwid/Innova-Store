<template>
  <div class="store-pos">
    <v-card border rounded="lg" elevation="0" class="pos-header">
      <div class="d-flex align-center ga-3">
        <v-avatar color="primary" variant="tonal" size="44" rounded="lg"><v-icon size="26">mdi-point-of-sale</v-icon></v-avatar>
        <div>
          <h1 class="text-h6 font-weight-bold">Punto de venta</h1>
          <p class="text-body-2 text-medium-emphasis">Selecciona productos y atiende varias ventas a la vez.</p>
        </div>
      </div>
      <div class="pos-header-actions">
        <v-chip :color="openBox ? 'success' : 'warning'" variant="tonal" size="small" :prepend-icon="openBox ? 'mdi-check-circle-outline' : 'mdi-lock-outline'">{{ loading ? 'Consultando caja' : openBox ? 'Caja abierta' : 'Caja cerrada' }}</v-chip>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-clock-outline" @click="waitingDialog = true">En espera <v-chip size="x-small" color="primary" class="ms-2">{{ waiting.length }}</v-chip></v-btn>
        <v-btn variant="tonal" color="primary" prepend-icon="mdi-plus" :disabled="!canEdit" @click="newSale">Nueva venta <span class="pos-key ms-2">Alt+N</span></v-btn>
        <v-btn icon="mdi-refresh" variant="text" color="primary" :loading="loading" aria-label="Actualizar productos y caja" @click="loadCatalog" />
      </div>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" closable @click:close="error = ''">{{ error }}</v-alert>
    <v-alert v-if="storageError" type="warning" variant="tonal" density="compact" class="mt-3">{{ storageError }}</v-alert>
    <v-alert v-if="!loading && !openBox && !error" type="warning" variant="tonal" density="compact" class="mt-3">
      <div class="d-flex align-center flex-wrap ga-2"><span>Abre la caja de la sucursal para iniciar o modificar ventas.</span><v-spacer /><v-btn size="small" variant="tonal" color="warning" :to="{ name: 'operaciones-caja' }">Ir a caja</v-btn></div>
    </v-alert>

    <v-sheet border rounded="lg" class="pos-tabs mt-3">
      <v-slide-group show-arrows class="flex-grow-1">
        <v-slide-group-item v-for="draft in drafts" :key="draft.id">
          <v-btn :variant="draft.id === activeId ? 'flat' : 'text'" :color="draft.id === activeId ? 'primary' : undefined" rounded="lg" class="ma-1" :aria-pressed="draft.id === activeId" @click="switchSale(draft.id)">
            <v-icon size="17" class="me-2">{{ draft.onHold ? 'mdi-pause-circle-outline' : 'mdi-cart-outline' }}</v-icon>
            <span class="pos-tab-label">Venta #{{ draft.number }} · {{ saleName(draft) }}</span>
            <v-chip v-if="draft.lines.length" size="x-small" :color="draft.id === activeId ? 'white' : 'primary'" variant="tonal" class="ms-2">{{ draft.lines.length }}</v-chip>
          </v-btn>
        </v-slide-group-item>
      </v-slide-group>
      <v-btn icon="mdi-plus" variant="text" color="primary" :disabled="!canEdit" aria-label="Nueva venta" class="ma-1" @click="newSale" />
    </v-sheet>

    <div class="pos-workspace mt-3" :data-mobile-panel="mobilePanel">
      <!-- The restaurant POS places the order on the left and catalog on the right. -->
      <v-card border rounded="lg" elevation="0" class="pos-order">
        <div class="pos-panel-heading">
          <div class="d-flex align-center ga-2"><v-icon color="primary" size="21">mdi-cart-outline</v-icon><strong>{{ active ? `Venta #${active.number}` : 'Tu venta' }}</strong><v-chip v-if="active" color="primary" variant="tonal" size="x-small">En atención</v-chip></div>
          <span class="text-caption text-medium-emphasis">{{ active?.lines.length || 0 }} productos</span>
        </div>
        <template v-if="active">
          <div class="pos-customer border-b">
            <v-btn variant="text" class="pos-customer-button" prepend-icon="mdi-account-outline" :disabled="!canEdit" @click="openCustomer">
              <span class="text-truncate">{{ saleName(active) }}</span><v-icon size="17" class="ms-2">mdi-pencil-outline</v-icon>
            </v-btn>
            <v-select :model-value="active.warehouseId" :items="warehouses" item-title="nombre" item-value="idAlmacen" label="Almacén de salida" prepend-inner-icon="mdi-warehouse" variant="outlined" density="compact" hide-details :disabled="!canEdit" @update:model-value="changeWarehouse" />
          </div>
          <div class="pos-cart-scroll">
            <div v-if="active.lines.length" class="pos-cart-mobile">
              <article v-for="line in active.lines" :key="`${line.productId}:${line.warehouseId}`" class="pos-mobile-line">
                <div class="d-flex align-start ga-2"><div class="flex-grow-1 min-w-0"><strong>{{ line.name }}</strong><div class="text-caption text-medium-emphasis">{{ money(line.price) }} / {{ line.unit }}</div></div><v-btn icon="mdi-delete-outline" variant="text" color="error" :disabled="!canEdit" :aria-label="`Quitar ${line.name}`" @click="removeLine(line)" /></div>
                <div class="d-flex align-center justify-space-between ga-2 mt-2"><div class="pos-quantity"><v-btn icon="mdi-minus" variant="tonal" :disabled="!canEdit" :aria-label="`Reducir cantidad de ${line.name}`" @click="adjustQuantity(line, -1)" /><input :value="line.quantity" type="number" min="0.001" step="0.001" inputmode="decimal" :aria-label="`Cantidad de ${line.name}`" :disabled="!canEdit" @change="editQuantity(line, $event)" /><v-btn icon="mdi-plus" variant="tonal" color="primary" :disabled="!canEdit" :aria-label="`Aumentar cantidad de ${line.name}`" @click="adjustQuantity(line, 1)" /></div><strong class="text-no-wrap">{{ money(line.quantity * line.price) }}</strong></div>
                <p v-if="lineIssue(line)" class="text-caption text-error mt-2">{{ lineIssue(line) }}</p>
              </article>
            </div>
            <v-table v-if="active.lines.length" density="compact" class="pos-cart-table">
              <thead><tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-end">Total</th><th /></tr></thead>
              <tbody>
                <tr v-for="line in active.lines" :key="`${line.productId}:${line.warehouseId}`">
                  <td><div class="pos-line-name">{{ line.name }}</div><div class="text-caption text-medium-emphasis mt-1">{{ money(line.price) }} / {{ line.unit }}</div><div v-if="lineIssue(line)" class="text-caption text-error mt-1">{{ lineIssue(line) }}</div></td>
                  <td><div class="pos-quantity"><v-btn icon="mdi-minus" size="22" variant="tonal" :disabled="!canEdit" :aria-label="`Reducir cantidad de ${line.name}`" @click="adjustQuantity(line, -1)" /><input :value="line.quantity" type="number" min="0.001" step="0.001" :aria-label="`Cantidad de ${line.name}`" :disabled="!canEdit" @change="editQuantity(line, $event)" /><v-btn icon="mdi-plus" color="primary" size="22" variant="tonal" :disabled="!canEdit" :aria-label="`Aumentar cantidad de ${line.name}`" @click="adjustQuantity(line, 1)" /></div></td>
                  <td class="text-end font-weight-bold text-no-wrap">{{ money(line.quantity * line.price) }}</td>
                  <td><v-btn icon="mdi-delete-outline" size="25" variant="text" color="error" :disabled="!canEdit" :aria-label="`Quitar ${line.name}`" @click="removeLine(line)" /></td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="pos-empty-cart">
              <v-avatar size="74" color="primary" variant="tonal"><v-icon size="34">mdi-cart-outline</v-icon></v-avatar>
              <h2 class="text-subtitle-1 font-weight-bold mt-4">Tu carrito está vacío</h2>
              <p class="text-body-2 text-medium-emphasis mt-1">Selecciona un producto del catálogo<br />o escanea su código de barras.</p>
              <div class="pos-empty-hint"><v-icon size="16" class="me-1">mdi-cursor-default-click-outline</v-icon>Cada clic agrega una unidad</div>
            </div>
          </div>
          <div class="pos-order-bottom border-t">
            <v-text-field v-model="active.note" placeholder="Agregar una observación a la venta" prepend-inner-icon="mdi-note-text-outline" variant="underlined" density="compact" hide-details maxlength="500" :disabled="!canEdit" aria-label="Observación de la venta" class="mb-4" />
            <div class="d-flex justify-space-between text-body-2 text-medium-emphasis"><span>{{ itemCount }} {{ itemCount === 1 ? 'unidad' : 'unidades' }}</span><span>{{ branch.sucursalActual?.nombre }}</span></div>
            <div class="pos-total"><span>Total</span><span>{{ money(total) }}</span></div>
            <div class="pos-secondary-actions"><v-btn variant="tonal" color="error" prepend-icon="mdi-close-circle-outline" :disabled="!canEdit" @click="discardDialog = true">Descartar</v-btn><v-btn variant="outlined" color="primary" prepend-icon="mdi-pause-circle-outline" :disabled="!canEdit || !active.lines.length" @click="holdSale">Dejar en espera</v-btn></div>
            <v-btn color="success" variant="flat" block size="large" prepend-icon="mdi-cash-register" class="font-weight-bold mt-2" :disabled="!canEdit || !active.lines.length || !!cartIssue" @click="openCheckout">Cobrar {{ money(total) }}<span class="pos-key ms-auto">F10</span></v-btn>
          </div>
        </template>
        <div v-else class="pos-empty-cart"><v-icon size="54" color="primary">mdi-cart-outline</v-icon><p class="mt-3 text-medium-emphasis">Inicia una venta para agregar productos.</p><v-btn class="mt-4" color="primary" :disabled="!canEdit" @click="newSale">Nueva venta</v-btn></div>
      </v-card>

      <v-card border rounded="lg" elevation="0" class="pos-catalog">
        <div class="pos-panel-heading"><div class="d-flex align-center ga-2"><v-icon color="primary" size="21">mdi-package-variant-closed</v-icon><strong>Productos</strong><v-chip size="x-small" variant="tonal">{{ products.length }}</v-chip></div><v-btn :to="{ name: 'operaciones-ventas' }" variant="text" size="small" color="primary" prepend-icon="mdi-history">Historial</v-btn></div>
        <div class="pa-3 border-b"><v-btn v-if="auth.puede(Permiso.LOGISTICA_VER)" color="primary" variant="tonal" prepend-icon="mdi-image-search-outline" class="mb-3" :disabled="!canEdit || !active?.warehouseId" @click="recognitionDialog = true">Reconocer por foto</v-btn><v-text-field ref="searchField" v-model="search" placeholder="Buscar producto o escanear código..." prepend-inner-icon="mdi-magnify" append-inner-icon="mdi-barcode-scan" variant="outlined" density="compact" hide-details clearable aria-label="Buscar productos" @keyup.enter="addByBarcode" /><div class="d-flex justify-space-between text-caption text-medium-emphasis mt-2 ga-2"><span>{{ catalogWarehouseId ? warehouseName(catalogWarehouseId) : 'Selecciona un almacén para ver el stock' }}</span><span class="text-no-wrap">{{ filteredProducts.length }} resultados</span></div></div>
        <div class="pos-categories border-b"><v-chip-group v-model="categoryId" mandatory selected-class="text-primary" show-arrows><v-chip :value="0" variant="tonal" rounded="lg" filter>Todos</v-chip><v-chip v-for="category in categories" :key="category.idCategoria" :value="category.idCategoria" variant="tonal" rounded="lg" filter><span class="pos-category-dot" :style="{ background: category.color || 'rgb(var(--v-theme-primary))' }" />{{ category.nombre }}</v-chip></v-chip-group></div>
        <div class="pos-products-scroll">
          <div v-if="loading" class="pos-product-grid"><v-skeleton-loader v-for="index in 8" :key="index" type="image, list-item-two-line" /></div>
          <div v-else-if="filteredProducts.length" class="pos-product-grid">
            <button v-for="product in filteredProducts" :key="product.idProductoSucursal" type="button" class="pos-product-card" :disabled="!canAdd(product)" :aria-label="`Agregar ${product.producto.nombre}, ${money(product.precioVenta)}`" @click="addProduct(product)">
              <div class="pos-product-image"><v-img v-if="product.producto.imagen" :src="product.producto.imagen" cover height="100%"><template #error><div class="pos-product-placeholder"><v-icon size="36">mdi-package-variant-closed</v-icon></div></template></v-img><div v-else class="pos-product-placeholder"><v-icon size="36">mdi-package-variant-closed</v-icon></div><span class="pos-product-price">{{ money(product.precioVenta) }}</span><span v-if="quantityInCart(product.idProductoSucursal)" class="pos-in-cart">{{ quantityInCart(product.idProductoSucursal) }} en carrito</span></div>
              <div class="pos-product-info"><div class="pos-product-name">{{ product.producto.nombre }}</div><div class="pos-product-meta"><span>{{ product.producto.unidadMedida.simbolo }}</span><span :class="stockFor(product.idProductoSucursal) <= 0 ? 'text-error' : 'text-success'">{{ catalogWarehouseId ? `${quantityLabel(stockFor(product.idProductoSucursal))} disponibles` : 'Sin almacén' }}</span></div><div v-if="Number(product.precioVenta) <= 0" class="text-caption text-error mt-1">Sin precio de venta</div></div>
            </button>
          </div>
          <div v-else class="pos-catalog-empty"><v-icon size="50" color="medium-emphasis">mdi-package-variant-closed</v-icon><h2 class="text-subtitle-1 mt-3">{{ error ? 'No se pudo cargar el catálogo' : 'No se encontraron productos' }}</h2><p class="text-body-2 text-medium-emphasis mt-1">{{ search || categoryId ? 'Prueba con otro nombre, código o categoría.' : 'Asigna productos activos a esta sucursal para empezar.' }}</p><v-btn v-if="search || categoryId" variant="tonal" color="primary" class="mt-4" @click="search = ''; categoryId = 0">Limpiar filtros</v-btn></div>
        </div>
        <div class="pos-catalog-footer border-t"><span><v-icon size="15" class="me-1">mdi-barcode-scan</v-icon>Escanea y presiona Enter</span><span>Buscar <kbd>F2</kbd> · Cobrar <kbd>F10</kbd></span></div>
      </v-card>
    </div>

    <nav class="pos-mobile-navigation" aria-label="Paneles del punto de venta">
      <v-btn variant="flat" :color="mobilePanel === 'catalogo' ? 'primary' : 'surface'" prepend-icon="mdi-view-grid-outline" :aria-pressed="mobilePanel === 'catalogo'" @click="mobilePanel = 'catalogo'">Productos</v-btn>
      <v-btn variant="flat" :color="mobilePanel === 'carrito' ? 'primary' : 'surface'" prepend-icon="mdi-cart-outline" :aria-pressed="mobilePanel === 'carrito'" @click="mobilePanel = 'carrito'">Carrito ({{ active?.lines.length || 0 }}) · {{ money(total) }}</v-btn>
    </nav>

    <ReconocerProductoDialog v-if="recognitionDialog" v-model="recognitionDialog" :id-sucursal="branchId" :validar-seleccion="visualSelectionIssue" @seleccionar="addVisualProduct" />

    <v-dialog v-model="waitingDialog" max-width="640" scrollable>
      <v-card rounded="lg"><div class="pos-dialog-heading"><v-avatar color="primary" variant="tonal" rounded="lg" size="38"><v-icon>mdi-clock-outline</v-icon></v-avatar><div><div class="text-subtitle-1 font-weight-bold">Ventas en espera</div><div class="text-caption text-medium-emphasis">{{ branch.sucursalActual?.nombre }} · {{ waiting.length }} pendientes</div></div><v-spacer /><v-btn icon="mdi-close" variant="text" aria-label="Cerrar ventas en espera" @click="waitingDialog = false" /></div><v-card-text class="pa-4"><v-text-field v-model="waitingSearch" placeholder="Buscar por cliente o número de venta" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable class="mb-3" /><div v-if="filteredWaiting.length" class="pos-waiting-list"><button v-for="draft in filteredWaiting" :key="draft.id" class="pos-waiting-card" @click="switchSale(draft.id); waitingDialog = false"><v-avatar color="primary" variant="tonal" rounded="lg" size="42"><v-icon>mdi-cart-outline</v-icon></v-avatar><div class="flex-grow-1 text-left"><strong>Venta #{{ draft.number }} · {{ saleName(draft) }}</strong><div class="text-caption text-medium-emphasis mt-1">{{ draft.lines.length }} productos · {{ timeLabel(draft.openedAt) }}</div></div><strong class="text-primary">{{ money(draftTotal(draft)) }}</strong><v-icon size="20">mdi-chevron-right</v-icon></button></div><div v-else class="pos-dialog-empty"><v-icon size="48" color="primary">mdi-clock-check-outline</v-icon><p class="font-weight-bold mt-3">{{ waitingSearch ? 'Sin coincidencias' : 'No hay ventas en espera' }}</p><p class="text-body-2 text-medium-emphasis mt-1">Deja una venta en espera para atender al siguiente cliente.</p></div><p class="text-caption text-medium-emphasis mt-4"><v-icon size="14" class="me-1">mdi-information-outline</v-icon>Estas ventas se conservan en este navegador y no reservan stock.</p></v-card-text></v-card>
    </v-dialog>

    <v-dialog v-model="customerDialog" max-width="480">
      <v-card rounded="lg"><div class="pos-dialog-heading"><v-icon color="primary">mdi-account-outline</v-icon><strong>Identificar esta venta</strong><v-spacer /><v-btn icon="mdi-close" variant="text" aria-label="Cerrar cliente" @click="customerDialog = false" /></div><v-card-text class="pa-5"><v-text-field v-model="customerReference" label="Nombre o referencia" placeholder="Ej. Ana, cliente camisa azul" maxlength="100" variant="outlined" density="comfortable" /><v-autocomplete v-model="customerId" :items="clients" item-title="nombre" item-value="id" label="Cliente registrado (opcional)" variant="outlined" density="comfortable" clearable :loading="clientsLoading" :disabled="!auth.puede(Permiso.PERSONAS_VER)" /><v-alert v-if="clientsError" type="warning" density="compact" variant="tonal">{{ clientsError }}</v-alert><p class="text-caption text-medium-emphasis">La referencia te ayuda a reconocer el carrito cuando atiendes a varios clientes.</p></v-card-text><v-card-actions class="pa-4"><v-spacer /><v-btn @click="customerDialog = false">Cancelar</v-btn><v-btn color="primary" variant="flat" :disabled="!canEdit" @click="saveCustomer">Guardar</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-dialog v-model="checkoutDialog" max-width="900" scrollable persistent>
      <v-card rounded="lg"><div class="pos-dialog-heading"><v-avatar color="primary" variant="tonal" rounded="lg" size="38"><v-icon>mdi-cash-register</v-icon></v-avatar><div><div class="font-weight-bold">Cobrar venta #{{ active?.number }}</div><div class="text-caption text-medium-emphasis">{{ active ? saleName(active) : '' }}</div></div><v-spacer /><v-btn icon="mdi-close" variant="text" aria-label="Cerrar cobro" :disabled="checkoutSaving" @click="checkoutDialog = false" /></div><v-card-text class="pa-5"><v-alert type="info" variant="tonal" density="compact" class="mb-5">Confirma los medios de pago y el efectivo recibido. Al registrar se actualizarán caja e inventario.</v-alert><v-alert v-if="checkoutError" type="warning" variant="tonal" density="compact" class="mb-4">{{ checkoutError }}</v-alert><div class="pos-checkout-grid"><div><div class="text-subtitle-2 font-weight-bold mb-3">Modalidad de venta</div><v-btn-toggle v-model="paymentMode" mandatory color="primary" variant="outlined" divided class="mb-5"><v-btn value="cash">Contado</v-btn><v-btn value="credit">Crédito</v-btn></v-btn-toggle><PagosEditor v-model="payments" :medios="paymentMethods" /><v-text-field v-if="cashPayment > 0" v-model="cashReceived" label="Efectivo recibido" prefix="S/" type="number" min="0" step="0.01" variant="outlined" density="comfortable" class="mt-4" :error-messages="receivedIssue" /><template v-if="paymentMode === 'credit'"><v-autocomplete v-model="creditClientId" :items="clients" item-title="nombre" item-value="id" label="Cliente para el crédito" variant="outlined" density="comfortable" :loading="clientsLoading" class="mt-4" /><v-text-field v-model="dueDate" label="Fecha de vencimiento (opcional)" type="date" variant="outlined" density="comfortable" /></template></div><v-card variant="tonal" color="primary" rounded="lg" class="align-self-start"><v-card-text class="pa-5"><div class="text-caption">TOTAL A COBRAR</div><div class="text-h4 font-weight-bold mt-1 mb-5">{{ money(total) }}</div><div class="pos-payment-summary"><div><span>Importe distribuido</span><strong>{{ money(paidTotal) }}</strong></div><div><span>{{ paymentMode === 'credit' ? 'Saldo a crédito' : 'Falta distribuir' }}</span><strong>{{ money(Math.max(0, total - paidTotal)) }}</strong></div><v-divider /><div><span>Vuelto en efectivo</span><strong>{{ money(change) }}</strong></div></div><v-alert v-if="paymentIssue" type="warning" density="compact" variant="tonal" class="mt-4">{{ paymentIssue }}</v-alert></v-card-text></v-card></div></v-card-text><v-divider /><v-card-actions class="pa-4"><v-btn variant="text" :disabled="checkoutSaving" @click="checkoutDialog = false">Volver a la venta</v-btn><v-spacer /><v-btn color="success" variant="flat" prepend-icon="mdi-check-circle-outline" :loading="checkoutSaving" :disabled="!canEdit || checkoutLoading || !!cartIssue || !!paymentIssue || !!receivedIssue || !active?.lines.length" @click="registerSale">Registrar venta</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-dialog v-model="discardDialog" max-width="420"><v-card rounded="lg"><v-card-title class="pa-5">Descartar venta #{{ active?.number }}</v-card-title><v-card-text>Se quitará este carrito y sus productos de las ventas pendientes.</v-card-text><v-card-actions class="pa-4"><v-spacer /><v-btn @click="discardDialog = false">Volver</v-btn><v-btn color="error" variant="flat" :disabled="!canEdit" @click="discardSale">Descartar</v-btn></v-card-actions></v-card></v-dialog>
    <v-snackbar v-model="notice.show" :color="notice.color" timeout="3500">{{ notice.message }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { getApiErrorMessage } from '@/core/api/api-error'
import { mediosPagoApi, personasApi } from '@/core/api/administracion.api'
import { Permiso } from '@/core/constants/permisos'
import type { MedioPago, PersonaRegistro } from '@/core/types/administracion.types'
import { useAuthStore } from '@/modules/auth/auth.store'
import { almacenesApi, configuracionesApi, inventariosApi, productoSucursalApi } from '@/modules/logistica/logistica.api'
import type { Almacen, Inventario, Pagina, ProductoSucursal } from '@/modules/logistica/logistica.types'
import PagosEditor from '@/modules/operaciones/components/PagosEditor.vue'
import { cajasApi, ventasApi } from '@/modules/operaciones/operaciones.api'
import type { Caja, PagoPayload } from '@/modules/operaciones/operaciones.types'
import { useSucursalStore } from '@/shared/stores/sucursal.store'
import ReconocerProductoDialog from '@/modules/reconocimiento/components/ReconocerProductoDialog.vue'
import type { CandidatoVisual, SeleccionVisual } from '@/modules/reconocimiento/reconocimiento.types'
import { draftTotal, usePosDrafts, type PosDraft, type PosLine } from '../pos-drafts'
import '../pos.css'

const auth = useAuthStore()
const branch = useSucursalStore()
const userId = computed(() => auth.usuario?.idUsuario)
const branchId = computed(() => branch.idSucursalActual)
const { drafts, active, waiting, activeId, storageError, create, select, discard, removeConfirmed } = usePosDrafts(userId, branchId)
const products = ref<ProductoSucursal[]>([])
const warehouses = ref<Almacen[]>([])
const inventory = ref<Inventario[]>([])
const openBox = ref<Caja | null>(null)
const negativeStock = ref(false)
const loading = ref(false)
const error = ref('')
const search = ref('')
const categoryId = ref(0)
const searchField = ref<{ focus: () => void } | null>(null)
const waitingDialog = ref(false)
const waitingSearch = ref('')
const discardDialog = ref(false)
const recognitionDialog = ref(false)
const mobilePanel = ref<'catalogo' | 'carrito'>('catalogo')
const customerDialog = ref(false)
const customerReference = ref('')
const customerId = ref<number | null>(null)
const clients = ref<PersonaRegistro[]>([])
const clientsLoading = ref(false)
const clientsError = ref('')
const checkoutDialog = ref(false)
const checkoutError = ref('')
const checkoutSaving = ref(false)
const checkoutLoading = ref(false)
const payments = ref<PagoPayload[]>([])
const paymentMethods = ref<MedioPago[]>([])
const paymentMode = ref('cash')
const cashReceived = ref('')
const creditClientId = ref<number | null>(null)
const dueDate = ref('')
const notice = reactive({ show: false, message: '', color: 'primary' })
let catalogRequest = 0
let clientsRequest = 0

const canEdit = computed(() => auth.puede(Permiso.VENTAS_GESTIONAR) && !!openBox.value && !loading.value && !error.value && !checkoutSaving.value)
const total = computed(() => active.value ? draftTotal(active.value) : 0)
const itemCount = computed(() => quantityLabel(active.value?.lines.reduce((count, line) => count + line.quantity, 0) ?? 0))
const categories = computed(() => [...new Map(products.value.map(product => [product.producto.idCategoria, product.producto.categoria])).values()])
const filteredProducts = computed(() => {
  const term = (search.value || '').trim().toLocaleLowerCase('es')
  return products.value.filter(product => (!categoryId.value || product.producto.idCategoria === categoryId.value) && (!term || `${product.producto.nombre} ${product.producto.codigoBarras || ''}`.toLocaleLowerCase('es').includes(term)))
})
const filteredWaiting = computed(() => {
  const term = (waitingSearch.value || '').trim().toLocaleLowerCase('es')
  return waiting.value.filter(draft => `${draft.number} ${saleName(draft)}`.toLocaleLowerCase('es').includes(term))
})
const defaultWarehouseId = computed(() => warehouses.value.find(warehouse => warehouse.tipo === 'AREA_VENTA')?.idAlmacen ?? warehouses.value[0]?.idAlmacen ?? null)
// Consultar existencias no requiere abrir caja ni crear una venta.
const catalogWarehouseId = computed(() => active.value
  ? warehouses.value.find(warehouse => warehouse.idAlmacen === active.value?.warehouseId)?.idAlmacen ?? null
  : defaultWarehouseId.value)
const stockByProduct = computed(() => new Map(inventory.value.filter(item => item.idAlmacen === catalogWarehouseId.value).map(item => [item.idProductoSucursal, Number(item.stock)])))
const cartIssue = computed(() => active.value?.lines.map(lineIssue).find(Boolean) || '')
const paidTotal = computed(() => Math.round(payments.value.reduce((amount, payment) => amount + (Number(payment.monto) || 0), 0) * 100) / 100)
const cashMethod = computed(() => paymentMethods.value.find(method => method.nombre.trim().toLowerCase() === 'efectivo'))
const cashPayment = computed(() => payments.value.filter(payment => payment.idMedioPago === cashMethod.value?.idMedioPago).reduce((amount, payment) => amount + (Number(payment.monto) || 0), 0))
const change = computed(() => cashPayment.value > 0 ? Math.max(0, Math.round(((Number(cashReceived.value) || 0) - cashPayment.value) * 100) / 100) : 0)
const receivedIssue = computed(() => cashPayment.value > 0 && Number(cashReceived.value) < cashPayment.value ? 'El efectivo recibido debe cubrir el importe aplicado.' : '')
const paymentIssue = computed(() => {
  if (paidTotal.value > total.value) return 'Los pagos superan el total de la venta.'
  if (paymentMode.value === 'cash' && paidTotal.value < total.value) return 'Distribuye el total entre los medios de pago.'
  if (paymentMode.value === 'credit' && !creditClientId.value) return 'Selecciona el cliente para el crédito.'
  if (paymentMode.value === 'credit' && paidTotal.value >= total.value) return 'La venta a crédito debe dejar un saldo pendiente.'
  return ''
})

async function allPages<T>(fetchPage: (page: number) => Promise<{ data: Pagina<T> }>) {
  const items: T[] = []
  let page = 1
  let count = 0
  do {
    const response = await fetchPage(page++)
    items.push(...response.data.data)
    count = response.data.total
    if (!response.data.data.length) break
  } while (items.length < count)
  return items
}

async function loadCatalog() {
  const idSucursal = branchId.value
  const request = ++catalogRequest
  loading.value = true
  error.value = ''
  openBox.value = null
  products.value = []
  warehouses.value = []
  inventory.value = []
  if (!idSucursal) { loading.value = false; return }
  try {
    const [productData, warehouseData, inventoryData, box, config] = await Promise.all([
      allPages(page => productoSucursalApi.listar({ idSucursal, estado: true, pagina: page, limite: 100 })),
      allPages(page => almacenesApi.listar({ idSucursal, estado: true, pagina: page, limite: 100 })),
      allPages(page => inventariosApi.listar({ idSucursal, pagina: page, limite: 100 })),
      cajasApi.abierta(idSucursal).catch(cause => { if (isAxiosError(cause) && cause.response?.status === 404) return null; throw cause }),
      configuracionesApi.listar(),
    ])
    if (request !== catalogRequest) return
    products.value = productData.filter(product => product.producto.estado)
    warehouses.value = warehouseData
    inventory.value = inventoryData
    openBox.value = box?.data ?? null
    negativeStock.value = config.data.some(item => item.nombre === 'STOCK_NEGATIVO' && item.activo)
    // Recupera carritos vacíos guardados antes de recrear o retirar un almacén.
    // Los carritos con productos conservan su origen para revisión del usuario.
    for (const draft of drafts.value) {
      if (!draft.lines.length && !warehouseData.some(warehouse => warehouse.idAlmacen === draft.warehouseId)) draft.warehouseId = defaultWarehouseId.value
    }
    if (!active.value && canCreate()) create(defaultWarehouseId.value)
  } catch (cause) {
    if (request === catalogRequest) error.value = getApiErrorMessage(cause, 'No se pudieron cargar los productos, el inventario y la caja.')
  } finally {
    if (request === catalogRequest) loading.value = false
  }
}

function canCreate() { return auth.puede(Permiso.VENTAS_GESTIONAR) && !!openBox.value }
function saleName(draft: PosDraft) { return draft.reference || draft.clientName || 'Cliente general' }
function money(value: string | number) { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value) || 0) }
function quantityLabel(value: number) { return Math.round(value * 1000) / 1000 }
function warehouseName(id: number) { return warehouses.value.find(warehouse => warehouse.idAlmacen === id)?.nombre || 'Almacén no disponible' }
function timeLabel(date: string) { return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }).format(new Date(date)) }
function stockFor(id: number) { return stockByProduct.value.get(id) ?? 0 }
function quantityInCart(id: number) { return active.value?.lines.filter(line => line.productId === id).reduce((count, line) => count + line.quantity, 0) ?? 0 }
function showNotice(message: string, color = 'primary') { Object.assign(notice, { message, color, show: true }) }
function canAdd(product: ProductoSucursal) {
  return canEdit.value && !!active.value?.warehouseId && warehouses.value.some(warehouse => warehouse.idAlmacen === active.value?.warehouseId) && Number(product.precioVenta) > 0 && (negativeStock.value || quantityInCart(product.idProductoSucursal) < stockFor(product.idProductoSucursal))
}
function lineIssue(line: PosLine) {
  if (!products.value.some(product => product.idProductoSucursal === line.productId)) return 'Producto no disponible'
  if (!warehouses.value.some(warehouse => warehouse.idAlmacen === line.warehouseId)) return 'Almacén no disponible'
  const stock = Number(inventory.value.find(item => item.idProductoSucursal === line.productId && item.idAlmacen === line.warehouseId)?.stock ?? 0)
  return !negativeStock.value && line.quantity > stock ? `Stock disponible: ${quantityLabel(stock)}` : ''
}
function newSale() {
  if (!canEdit.value) return
  mobilePanel.value = 'catalogo'
  create(catalogWarehouseId.value ?? defaultWarehouseId.value)
  search.value = ''
}
function switchSale(id: string) { select(id); checkoutDialog.value = false; mobilePanel.value = 'carrito' }
function holdSale() {
  if (!canEdit.value || !active.value?.lines.length) return
  const number = active.value.number
  newSale()
  showNotice(`Venta #${number} en espera. Puedes atender al siguiente cliente.`)
}
function discardSale() {
  if (!canEdit.value || !active.value) return
  const warehouse = catalogWarehouseId.value ?? defaultWarehouseId.value
  discard(active.value.id)
  if (!active.value) create(warehouse)
  discardDialog.value = false
  showNotice('Carrito descartado.')
}
function changeWarehouse(value: unknown) {
  if (!canEdit.value || !active.value || typeof value !== 'number') return
  active.value.warehouseId = value
  active.value.lines.forEach(line => { line.warehouseId = value })
  if (cartIssue.value) showNotice('Revisa las cantidades: el stock corresponde al almacén seleccionado.', 'warning')
}
function addProduct(product: ProductoSucursal) {
  if (!canAdd(product) || !active.value?.warehouseId) return
  const line = active.value.lines.find(item => item.productId === product.idProductoSucursal)
  const increment = negativeStock.value ? 1 : Math.min(1, stockFor(product.idProductoSucursal) - quantityInCart(product.idProductoSucursal))
  if (line) line.quantity = quantityLabel(line.quantity + increment)
  else active.value.lines.push({ productId: product.idProductoSucursal, warehouseId: active.value.warehouseId, name: product.producto.nombre, unit: product.producto.unidadMedida.simbolo, quantity: quantityLabel(increment), price: Number(product.precioVenta) })
}
function visualSelectionIssue(candidate: CandidatoVisual, cantidad: number) {
  const product = products.value.find(item => item.idProductoSucursal === candidate.idProductoSucursal && item.idProducto === candidate.idProducto)
  if (!product) return 'Este producto ya no está disponible en el catálogo. Actualiza los productos.'
  if (!canAdd(product)) return 'Revisa la caja, el almacén, el precio y el stock de este producto.'
  if (Number(product.precioVenta) !== Number(candidate.precioVenta)) return 'El precio cambió. Actualiza el catálogo y vuelve a buscar.'
  const line = active.value?.lines.find(item => item.productId === product.idProductoSucursal)
  if (line && line.price !== Number(product.precioVenta)) return 'El precio de este producto cambió. Retíralo del carrito y vuelve a agregarlo.'
  if (!negativeStock.value && quantityLabel(cantidad + quantityInCart(product.idProductoSucursal)) > stockFor(product.idProductoSucursal)) return 'La cantidad supera el stock disponible en este almacén.'
  if (quantityLabel(cantidad + quantityInCart(product.idProductoSucursal)) > 99999999999.999) return 'La cantidad total supera el máximo permitido.'
  return ''
}
function addVisualProduct({ candidato, cantidad }: SeleccionVisual) {
  const issue = visualSelectionIssue(candidato, cantidad)
  if (issue) { showNotice(issue, 'warning'); return }
  if (!Number.isFinite(cantidad) || cantidad <= 0 || !active.value?.warehouseId) return
  const product = products.value.find(item => item.idProductoSucursal === candidato.idProductoSucursal)
  if (!product) return
  const line = active.value.lines.find(item => item.productId === product.idProductoSucursal)
  if (line) line.quantity = quantityLabel(line.quantity + cantidad)
  else active.value.lines.push({ productId: product.idProductoSucursal, warehouseId: active.value.warehouseId, name: product.producto.nombre, unit: product.producto.unidadMedida.simbolo, quantity: cantidad, price: Number(product.precioVenta) })
  recognitionDialog.value = false
  mobilePanel.value = 'carrito'
  showNotice(`${product.producto.nombre} agregado al carrito.`, 'success')
}
function removeLine(line: PosLine) { if (canEdit.value && active.value) active.value.lines = active.value.lines.filter(item => item !== line) }
function setQuantity(line: PosLine, quantity: number) {
  if (!canEdit.value || !Number.isFinite(quantity) || quantity <= 0 || quantity > 99999999999.999) return false
  const next = quantityLabel(quantity)
  if (next <= 0) return false
  if (!negativeStock.value && next > stockFor(line.productId)) { showNotice('La cantidad supera el stock disponible.', 'warning'); return false }
  line.quantity = next
  return true
}
function adjustQuantity(line: PosLine, step: number) {
  if (line.quantity + step <= 0) removeLine(line)
  else setQuantity(line, line.quantity + step)
}
function editQuantity(line: PosLine, event: Event) {
  const input = event.target as HTMLInputElement
  if (!setQuantity(line, Number(input.value))) input.value = String(line.quantity)
}
function addByBarcode() {
  const code = (search.value || '').trim()
  if (!code) return
  const matches = products.value.filter(product => product.producto.codigoBarras === code)
  const product = matches.length === 1 ? matches[0] : filteredProducts.value.length === 1 ? filteredProducts.value[0] : undefined
  if (!product) { showNotice(matches.length > 1 ? 'Hay varios productos con ese código. Selecciona el correcto.' : 'Selecciona un producto de los resultados.', 'warning'); return }
  if (!canAdd(product)) { showNotice('Revisa el almacén, la caja, el precio y el stock del producto.', 'warning'); return }
  addProduct(product)
  search.value = ''
}

async function loadClients() {
  if (!auth.puede(Permiso.PERSONAS_VER)) return
  const request = ++clientsRequest
  clientsLoading.value = true
  clientsError.value = ''
  try {
    const response = await personasApi.listar('CLIENTE')
    if (request === clientsRequest) clients.value = response.data.filter(client => client.activo)
  } catch (cause) {
    if (request === clientsRequest) clientsError.value = getApiErrorMessage(cause, 'No se pudieron cargar los clientes.')
  } finally { if (request === clientsRequest) clientsLoading.value = false }
}
function openCustomer() {
  if (!canEdit.value || !active.value) return
  customerReference.value = active.value.reference
  customerId.value = active.value.clientId
  customerDialog.value = true
  void loadClients()
}
function saveCustomer() {
  if (!canEdit.value || !active.value) return
  const previousClientId = active.value.clientId
  active.value.reference = customerReference.value.trim()
  active.value.clientId = customerId.value
  active.value.clientName = clients.value.find(client => client.id === customerId.value)?.nombre ?? (customerId.value === previousClientId ? active.value.clientName : '')
  customerDialog.value = false
}
async function openCheckout() {
  if (!canEdit.value || !active.value?.lines.length || cartIssue.value) return
  checkoutDialog.value = true
  checkoutError.value = ''
  payments.value = []
  paymentMode.value = 'cash'
  cashReceived.value = ''
  creditClientId.value = active.value.clientId
  dueDate.value = ''
  const saleId = active.value.id
  checkoutLoading.value = true
  void loadClients()
  try {
    const response = await mediosPagoApi.listar()
    if (!checkoutDialog.value || active.value?.id !== saleId) return
    paymentMethods.value = response.data.filter(method => method.nombre.trim().toLowerCase() !== 'fraccionado')
    const first = cashMethod.value ?? paymentMethods.value[0]
    if (first) payments.value = [{ idMedioPago: first.idMedioPago, monto: total.value.toFixed(2) }]
    cashReceived.value = total.value.toFixed(2)
  } catch (cause) { if (active.value?.id === saleId) checkoutError.value = getApiErrorMessage(cause, 'No se pudieron cargar los medios de pago.') }
  finally { checkoutLoading.value = false }
}
async function registerSale() {
  if (checkoutSaving.value || checkoutLoading.value || !canEdit.value || !checkoutDialog.value || !active.value?.lines.length || cartIssue.value || paymentIssue.value || receivedIssue.value || !openBox.value || !branchId.value || !userId.value) return
  const draft = active.value, branch = branchId.value, user = userId.value, box = openBox.value.idCaja
  const payload = {
    claveOperacion: draft.id, idCaja: box, idSucursal: branch, monto: total.value.toFixed(2), detalle: draft.note.trim() || draft.reference || undefined,
    productos: draft.lines.map(line => ({ idProductoSucursal: line.productId, idAlmacen: line.warehouseId, cantidad: line.quantity.toFixed(3), precioUnitario: line.price.toFixed(4) })),
    pagos: payments.value.map(payment => ({ idMedioPago: payment.idMedioPago, monto: Number(payment.monto).toFixed(2) })),
    ...(paymentMode.value === 'credit' ? { credito: { idCliente: creditClientId.value, fechaVencimiento: dueDate.value || undefined } } : {}),
  }
  checkoutSaving.value = true; checkoutError.value = ''
  try {
    await ventasApi.crear(payload)
    removeConfirmed(draft.id, user, branch)
    checkoutDialog.value = false
    showNotice(`Venta #${draft.number} registrada. Caja e inventario actualizados.`, 'success')
    await loadCatalog()
    mobilePanel.value = 'catalogo'
  } catch (cause) { if (active.value?.id === draft.id) checkoutError.value = getApiErrorMessage(cause, 'No se pudo confirmar la venta. Puedes reintentar este mismo carrito.'); else showNotice(getApiErrorMessage(cause, 'No se pudo confirmar la venta. Revisa su sucursal.'), 'error') }
  finally { checkoutSaving.value = false }
}
function keyboardShortcuts(event: KeyboardEvent) {
  const target = event.target
  const isTyping = target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
  if (recognitionDialog.value || checkoutDialog.value || customerDialog.value || waitingDialog.value || discardDialog.value || isTyping) return
  if (event.key === 'F2') { event.preventDefault(); searchField.value?.focus() }
  else if (event.key === 'F10') { event.preventDefault(); void openCheckout() }
  else if (event.altKey && event.key.toLowerCase() === 'n') { event.preventDefault(); newSale() }
}

watch(branchId, () => {
  recognitionDialog.value = false
  mobilePanel.value = 'catalogo'
  checkoutDialog.value = customerDialog.value = waitingDialog.value = discardDialog.value = false
  search.value = ''; categoryId.value = 0
  void loadCatalog()
}, { immediate: true })
watch([activeId, () => active.value?.warehouseId, canEdit], () => { recognitionDialog.value = false })
onMounted(() => window.addEventListener('keydown', keyboardShortcuts))
onBeforeUnmount(() => { catalogRequest++; clientsRequest++; window.removeEventListener('keydown', keyboardShortcuts) })
</script>
