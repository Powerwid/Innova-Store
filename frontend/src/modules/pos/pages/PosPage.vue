<template>
  <div class="store-pos">
    <v-sheet
      border
      rounded="lg"
      class="pos-toolbar"
      v-if="mdAndUp"
    >
      <v-chip
        :color="openBox ? 'success' : 'warning'"
        variant="tonal"
        :prepend-icon="openBox ? 'mdi-check-circle-outline' : 'mdi-lock-outline'"
      >
        {{ loading ? 'Consultando caja' : openBox ? 'Caja abierta' : 'Caja cerrada' }}
      </v-chip>
      <v-slide-group
        v-if="drafts.length > 1"
        :model-value="activeId"
        show-arrows
        class="pos-sale-tabs"
      >
        <v-slide-group-item
          v-for="draft in drafts"
          :key="draft.id"
          :value="draft.id"
        >
          <v-btn
            :variant="draft.id === activeId ? 'tonal' : 'text'"
            :color="draft.id === activeId ? 'primary' : undefined"
            :aria-pressed="draft.id === activeId"
            :disabled="checkoutSaving"
            @click="switchSale(draft.id)"
          >
            <v-icon
              size="18"
              class="me-2"
            >
              {{ draft.onHold ? 'mdi-pause-circle-outline' : 'mdi-cart-outline' }}
            </v-icon>
            <span class="pos-tab-label">{{ saleName(draft) }}</span>
            <v-chip
              v-if="draft.lines.length"
              size="x-small"
              class="ms-2"
            >
              {{ draft.lines.length }}
            </v-chip>
          </v-btn>
        </v-slide-group-item>
      </v-slide-group>
      <v-spacer v-if="drafts.length <= 1" />
      <div class="pos-toolbar-actions">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-clock-outline"
          @click="waitingDialog = true"
        >
          En espera
          <v-chip
            size="x-small"
            color="primary"
            class="ms-2"
          >
            {{ waiting.length }}
          </v-chip>
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          :disabled="!canEdit"
          @click="newSale"
        >
          Nueva venta
        </v-btn>
      </div>
    </v-sheet>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mt-3"
      closable
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>
    <v-alert
      v-if="storageError"
      type="warning"
      variant="tonal"
      density="compact"
      class="mt-3"
    >
      {{ storageError }}
    </v-alert>
    <v-alert
      v-if="!loading && !openBox && !error"
      type="warning"
      variant="tonal"
      density="compact"
      class="mt-3"
    >
      <div class="d-flex align-center flex-wrap ga-2">
        <span>Abre la caja de la sucursal para iniciar o modificar ventas.</span>
        <v-spacer />
        <v-btn
          size="small"
          variant="tonal"
          color="warning"
          :to="{ name: 'operaciones-caja' }"
        >
          Ir a caja
        </v-btn>
      </div>
    </v-alert>

    <div class="pos-workspace mt-3">
      <!-- The restaurant POS places the order on the left and catalog on the right. -->
      <v-card
        border
        rounded="lg"
        elevation="0"
        class="pos-order"
      >
        <template v-if="active">
          <div
            v-if="!mdAndUp"
            class="pos-mobile-order-header"
          >
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              aria-label="Ver ventas en espera"
              @click="waitingDialog = true"
            />
            <button
              class="pos-mobile-client"
              :disabled="!canEdit"
              @click="openCustomer"
            >
              {{ saleName(active) }}
            </button>
            <v-chip
              v-if="active.lines.length"
              size="small"
              variant="tonal"
            >
              {{ active.lines.length }}
            </v-chip>
            <v-chip
              size="small"
              :color="openBox ? 'success' : 'error'"
              variant="flat"
            >
              {{ openBox ? 'Abierta' : 'Cerrada' }}
            </v-chip>
          </div>
          <div
            v-if="mdAndUp"
            class="pos-customer border-b"
          >
            <v-btn
              variant="text"
              class="pos-customer-button"
              prepend-icon="mdi-account-outline"
              :disabled="!canEdit"
              @click="openCustomer"
            >
              <span class="text-truncate">{{ saleName(active) }}</span>
              <v-icon
                size="17"
                class="ms-2"
              >
                mdi-pencil-outline
              </v-icon>
            </v-btn>
            <div
              v-if="saleWarehouse"
              class="pos-warehouse text-caption text-medium-emphasis"
            >
              <v-icon
                size="16"
                class="me-1"
              >
                mdi-warehouse
              </v-icon>
              {{ saleWarehouse.nombre }}
            </div>
          </div>
          <div class="pos-cart-scroll">
            <!-- Tarjetas de la orden móvil adaptadas de MesasPosPage.vue. -->
            <div
              v-if="active.lines.length"
              class="pos-cart-mobile"
            >
              <v-card
                v-for="line in active.lines"
                :key="`${line.productId}:${line.warehouseId}`"
                rounded="lg"
                elevation="1"
                class="pos-mobile-line"
              >
                <div class="pos-mobile-line-top">
                  <v-avatar
                    color="primary"
                    variant="tonal"
                    size="34"
                    rounded="lg"
                  >
                    <v-icon size="18">mdi-package-variant-closed</v-icon>
                  </v-avatar>
                  <div class="pos-mobile-line-name">
                    <strong>{{ line.name }}</strong>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ money(line.price) }} / {{ line.unit }}
                    </div>
                  </div>
                  <div class="pos-mobile-line-status">
                    <v-chip
                      size="x-small"
                      :color="lineRemaining(line) < 0 ? 'error' : 'success'"
                      variant="tonal"
                      prepend-icon="mdi-package-variant"
                      class="font-weight-bold"
                    >
                      {{
                        lineRemaining(line) < 0
                          ? `Faltan ${quantityInputValue(-lineRemaining(line), line.unit)} ${quantityInputUnit(line.unit)}`
                          : `Quedan ${quantityInputValue(lineRemaining(line), line.unit)} ${quantityInputUnit(line.unit)}`
                      }}
                    </v-chip>
                    <v-btn
                      icon="mdi-delete-outline"
                      color="error"
                      size="small"
                      variant="text"
                      :disabled="!canEdit"
                      :aria-label="`Quitar ${line.name}`"
                      @click="removeLine(line)"
                    />
                  </div>
                </div>
                <v-divider class="my-3" />
                <div class="d-flex align-center justify-space-between ga-3">
                  <PosQuantityInput
                    :quantity="line.quantity" :unit="line.unit" :name="line.name" :disabled="!canEdit"
                    @change="setQuantity(line, $event)" @adjust="adjustQuantity(line, $event)"
                    @invalid="showNotice($event, 'warning')"
                  />
                  <strong class="text-primary text-no-wrap">
                    {{ money(line.quantity * line.price) }}
                  </strong>
                </div>
                <p
                  v-if="lineIssue(line)"
                  class="text-caption text-error mt-3"
                >
                  {{ lineIssue(line) }}
                </p>
              </v-card>
            </div>
            <v-table
              v-if="active.lines.length"
              density="compact"
              class="pos-cart-table"
            >
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-center">Cant.</th>
                  <th class="text-end">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="line in active.lines"
                  :key="`${line.productId}:${line.warehouseId}`"
                >
                  <td>
                    <div class="pos-line-name">{{ line.name }}</div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ money(line.price) }} / {{ line.unit }}
                    </div>
                    <div
                      v-if="lineIssue(line)"
                      class="text-caption text-error mt-1"
                    >
                      {{ lineIssue(line) }}
                    </div>
                  </td>
                  <td>
                    <PosQuantityInput
                      :quantity="line.quantity" :unit="line.unit" :name="line.name" :disabled="!canEdit"
                      @change="setQuantity(line, $event)" @adjust="adjustQuantity(line, $event)"
                      @invalid="showNotice($event, 'warning')"
                    />
                  </td>
                  <td class="text-end font-weight-bold text-no-wrap">
                    {{ money(line.quantity * line.price) }}
                  </td>
                  <td>
                    <v-btn
                      icon="mdi-delete-outline"
                      size="25"
                      variant="text"
                      color="error"
                      :disabled="!canEdit"
                      :aria-label="`Quitar ${line.name}`"
                      @click="removeLine(line)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div
              v-else
              class="pos-empty-cart"
            >
              <v-avatar
                size="74"
                color="primary"
                variant="tonal"
              >
                <v-icon size="34">mdi-cart-outline</v-icon>
              </v-avatar>
              <h2 class="text-subtitle-1 font-weight-bold mt-4">Tu carrito está vacío</h2>
              <p class="text-body-2 text-medium-emphasis mt-1">
                Selecciona un producto del catálogo
                <br />
                o escanea su código de barras.
              </p>
              <v-btn
                v-if="!mdAndUp"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-plus"
                class="mt-4"
                @click="mobileProductsSheet = true"
              >
                Agregar productos
              </v-btn>
              <div
                v-if="mdAndUp"
                class="pos-empty-hint"
              >
                <v-icon
                  size="16"
                  class="me-1"
                >
                  mdi-cursor-default-click-outline
                </v-icon>
                Elige el producto e indica el peso si se vende por kg
              </div>
            </div>
          </div>
          <div class="pos-order-bottom border-t">
            <div
              v-if="taxRate > 0"
              class="pos-order-breakdown"
            >
              <div>
                <span>Subtotal</span>
                <span>{{ money(orderSubtotal) }}</span>
              </div>
              <div>
                <span>IGV ({{ taxRate }}%)</span>
                <span>{{ money(total - orderSubtotal) }}</span>
              </div>
              <v-divider class="my-2" />
            </div>
            <div class="pos-total">
              <span>Total</span>
              <span class="text-primary">{{ money(total) }}</span>
            </div>
            <div
              v-if="mdAndUp"
              class="pos-cart-actions"
            >
              <v-btn
                variant="tonal"
                color="error"
                prepend-icon="mdi-close-circle-outline"
                :disabled="!canEdit"
                @click="discardDialog = true"
              >
                Descartar
              </v-btn>
              <v-btn
                variant="outlined"
                color="primary"
                prepend-icon="mdi-pause-circle-outline"
                :disabled="!canEdit || !active.lines.length"
                @click="holdSale"
              >
                En espera
              </v-btn>
              <v-btn
                color="success"
                variant="flat"
                prepend-icon="mdi-cash-register"
                class="pos-pay-button"
                :disabled="!canEdit || !active.lines.length || !!cartIssue"
                @click="openCheckout"
              >
                Cobrar
              </v-btn>
            </div>
            <div
              v-else
              class="pos-mobile-order-actions"
            >
              <v-btn
                color="error"
                variant="tonal"
                icon="mdi-close-circle-outline"
                rounded="circle"
                size="44"
                aria-label="Descartar venta"
                :disabled="!canEdit"
                @click="discardDialog = true"
              />
              <v-btn
                color="warning"
                variant="flat"
                icon="mdi-pause"
                rounded="circle"
                size="44"
                aria-label="Dejar venta en espera"
                :disabled="!canEdit || !active.lines.length"
                @click="holdSale"
              />
              <v-btn
                color="primary"
                variant="outlined"
                icon="mdi-note-text-outline"
                rounded="circle"
                size="44"
                aria-label="Nota de la venta"
                :disabled="!canEdit"
                @click="noteDialog = true"
              />
              <v-btn
                color="success"
                variant="elevated"
                prepend-icon="mdi-cash-register"
                height="44"
                class="flex-grow-1"
                :disabled="!canEdit || !active.lines.length || !!cartIssue"
                @click="openCheckout"
              >
                Pagar
              </v-btn>
            </div>
          </div>
        </template>
        <div
          v-else
          class="pos-empty-cart"
        >
          <v-icon
            size="54"
            color="primary"
          >
            mdi-cart-outline
          </v-icon>
          <p class="mt-3 text-medium-emphasis">Inicia una venta para agregar productos.</p>
          <v-btn
            class="mt-4"
            color="primary"
            :disabled="!canEdit"
            @click="newSale"
          >
            Nueva venta
          </v-btn>
        </div>
      </v-card>

      <PosCatalog
        v-if="mdAndUp"
        v-model:search="search"
        v-model:category-id="categoryId"
        :filtered-products="filteredProducts"
        :categories="categories"
        :loading="loading"
        :error="error"
        :can-edit="canEdit"
        :can-recognize="auth.puede(Permiso.LOGISTICA_VER)"
        :has-warehouse="!!catalogWarehouseId"
        :stock-for="stockFor"
        :quantity-in-cart="quantityInCart"
        :can-add="canAdd"
        @add="addProduct"
        @refresh="loadCatalog()"
        @recognize="openRecognition"
        @barcode="addByBarcode"
      />
    </div>

    <!-- Catálogo móvil: el mismo panel inferior del POS de Innova Restaurant. -->
    <Teleport to="body">
      <div
        v-if="
          !mdAndUp &&
          !mobileProductsSheet &&
          !checkoutDialog &&
          !customerDialog &&
          !waitingDialog &&
          !discardDialog &&
          !noteDialog
        "
        class="pos-products-fab"
        :class="{ 'pos-products-fab--tax': taxRate > 0 }"
      >
        <v-btn
          color="primary"
          icon
          size="56"
          rounded="circle"
          elevation="8"
          aria-label="Abrir productos"
          @click="mobileProductsSheet = true"
        >
          <v-icon size="26">mdi-basket-plus</v-icon>
        </v-btn>
        <span
          v-if="active?.lines.length"
          class="pos-fab-count"
          aria-hidden="true"
        >
          {{ active.lines.length }}
        </span>
      </div>
    </Teleport>
    <v-bottom-sheet
      v-if="!mdAndUp"
      v-model="mobileProductsSheet"
      inset
    >
      <v-card
        rounded="t-xl"
        class="pos-products-sheet"
      >
        <div class="pos-sheet-heading">
          <v-icon color="primary">mdi-package-variant-closed</v-icon>
          <strong>Productos</strong>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Ver productos escogidos"
            @click="mobileProductsSheet = false"
          />
        </div>
        <PosCatalog
          v-model:search="search"
          v-model:category-id="categoryId"
          :filtered-products="filteredProducts"
          :categories="categories"
          :loading="loading"
          :error="error"
          :can-edit="canEdit"
          :can-recognize="auth.puede(Permiso.LOGISTICA_VER)"
          :has-warehouse="!!catalogWarehouseId"
          :stock-for="stockFor"
          :quantity-in-cart="quantityInCart"
          :can-add="canAdd"
          @add="addProduct"
          @refresh="loadCatalog()"
          @recognize="openRecognition"
          @barcode="addByBarcode"
        />
        <div class="pos-sheet-footer">
          <span>{{ active?.lines.length || 0 }} productos escogidos</span>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-check"
            @click="mobileProductsSheet = false"
          >
            Ver venta
          </v-btn>
        </div>
      </v-card>
    </v-bottom-sheet>
    <v-dialog
      v-model="noteDialog"
      max-width="480"
    >
      <v-card rounded="lg">
        <v-card-title>Nota de la venta</v-card-title>
        <v-card-text>
          <v-textarea
            v-if="active"
            v-model="active.note"
            label="Comentario / Notas"
            maxlength="500"
            variant="outlined"
            :disabled="!canEdit"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            @click="noteDialog = false"
          >
            Listo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ReconocerProductoDialog
      v-if="recognitionDialog"
      v-model="recognitionDialog"
      :id-sucursal="branchId"
      :validar-seleccion="visualSelectionIssue"
      @seleccionar="addVisualProduct"
    />

    <v-dialog
      v-model="waitingDialog"
      max-width="640"
      scrollable
    >
      <v-card rounded="lg">
        <div class="pos-dialog-heading">
          <v-avatar
            color="primary"
            variant="tonal"
            rounded="lg"
            size="38"
          >
            <v-icon>mdi-clock-outline</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold">Ventas en espera</div>
            <div class="text-caption text-medium-emphasis">
              {{ branch.sucursalActual?.nombre }} · {{ waiting.length }} pendientes
            </div>
          </div>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Cerrar ventas en espera"
            @click="waitingDialog = false"
          />
        </div>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="waitingSearch"
            placeholder="Buscar por cliente"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            class="mb-3"
          />
          <div
            v-if="filteredWaiting.length"
            class="pos-waiting-list"
          >
            <button
              v-for="draft in filteredWaiting"
              :key="draft.id"
              class="pos-waiting-card"
              @click="chooseWaiting(draft.id)"
            >
              <v-avatar
                color="primary"
                variant="tonal"
                rounded="lg"
                size="42"
              >
                <v-icon>mdi-cart-outline</v-icon>
              </v-avatar>
              <div class="flex-grow-1 text-left">
                <strong>{{ saleName(draft) }}</strong>
                <div class="text-caption text-medium-emphasis mt-1">
                  {{ draft.lines.length }} productos ·
                  {{ timeLabel(draft.openedAt) }}
                </div>
              </div>
              <strong class="text-primary">{{ money(draftTotal(draft)) }}</strong>
              <v-icon size="20">mdi-chevron-right</v-icon>
            </button>
          </div>
          <div
            v-else
            class="pos-dialog-empty"
          >
            <v-icon
              size="48"
              color="primary"
            >
              mdi-clock-check-outline
            </v-icon>
            <p class="font-weight-bold mt-3">
              {{ waitingSearch ? 'Sin coincidencias' : 'No hay ventas en espera' }}
            </p>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Deja una venta en espera para atender al siguiente cliente.
            </p>
          </div>
          <p class="text-caption text-medium-emphasis mt-4">
            <v-icon
              size="14"
              class="me-1"
            >
              mdi-information-outline
            </v-icon>
            Estas ventas se conservan en este navegador y no reservan stock.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-plus"
            :disabled="!canEdit"
            @click="newWaitingSale"
          >
            Nueva venta
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="customerDialog"
      max-width="480"
    >
      <v-card rounded="lg">
        <div class="pos-dialog-heading">
          <v-icon color="primary">mdi-account-outline</v-icon>
          <strong>Identificar esta venta</strong>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Cerrar cliente"
            @click="customerDialog = false"
          />
        </div>
        <v-card-text class="pa-5">
          <v-text-field
            v-model="customerReference"
            label="Nombre o referencia"
            placeholder="Ej. Ana, cliente camisa azul"
            maxlength="100"
            variant="outlined"
            density="comfortable"
          />
          <v-autocomplete
            v-model="customerId"
            :items="clients"
            item-title="nombre"
            item-value="id"
            label="Cliente registrado (opcional)"
            variant="outlined"
            density="comfortable"
            clearable
            :loading="clientsLoading"
            :disabled="!auth.puede(Permiso.PERSONAS_VER)"
          />
          <v-alert
            v-if="clientsError"
            type="warning"
            density="compact"
            variant="tonal"
          >
            {{ clientsError }}
          </v-alert>
          <p class="text-caption text-medium-emphasis">
            La referencia te ayuda a reconocer el carrito cuando atiendes a varios clientes.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn @click="customerDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!canEdit"
            @click="saveCustomer"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <PosCheckoutDialog
      v-if="active"
      v-model="checkoutDialog"
      v-model:payments="payments"
      v-model:mode="paymentMode"
      v-model:client-id="creditClientId"
      v-model:received="cashReceived"
      v-model:due-date="dueDate"
      v-model:note="active.note"
      :branch-name="branch.sucursalActual?.nombre ?? ''"
      :total="total"
      :paid="paidTotal"
      :cash-amount="cashPayment"
      :change="change"
      :clients="clients"
      :methods="paymentMethods"
      :clients-loading="clientsLoading"
      :clients-error="clientsError"
      :can-read-clients="auth.puede(Permiso.PERSONAS_VER)"
      :can-create-clients="auth.puede(Permiso.PERSONAS_GESTIONAR)"
      :saving="checkoutSaving"
      :loading="checkoutLoading"
      :error="checkoutError"
      :issue="paymentIssue || receivedIssue || cartIssue"
      :can-submit="canEdit && !!active.lines.length"
      @submit="registerSale"
      @new-client="openClientCreation"
    />
    <PersonFormDialog
      v-model="clientFormDialog"
      role="CLIENTE"
      :person="newClientPrefill"
      :document-types="documentTypes"
      @created="clientCreated"
    />

    <PosPesoDialog
      v-model="weightDialog" :product="weightProduct" :available="weightAvailable"
      :disabled="!canEdit" :validate="weightSelectionIssue" @agregar="addWeight"
    />

    <v-dialog
      v-model="discardDialog"
      max-width="420"
    >
      <v-card rounded="lg">
        <v-card-title class="pa-5">Descartar venta</v-card-title>
        <v-card-text>Se quitará este carrito y sus productos de las ventas pendientes.</v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn @click="discardDialog = false">Volver</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :disabled="!canEdit"
            @click="discardSale"
          >
            Descartar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar
      v-model="notice.show"
      :color="notice.color"
      :timeout="notice.ticketBlocked ? -1 : 5000"
    >
      {{ notice.message }}
      <template #actions>
        <v-btn
          v-if="notice.ticketId"
          variant="text"
          @click="reopenTicket"
        >
          Ver ticket
        </v-btn>
        <v-btn
          v-if="notice.ticketBlocked"
          icon="mdi-close"
          variant="text"
          aria-label="Cerrar aviso"
          @click="notice.show = false"
        />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { isAxiosError } from 'axios';
import { useDisplay } from 'vuetify';
import PosCatalog from '../components/PosCatalog.vue';
import PosQuantityInput from '../components/PosQuantityInput.vue';
import PosPesoDialog from '../components/PosPesoDialog.vue';
import { getApiErrorMessage } from '@/core/api/api-error';
import { documentosApi, mediosPagoApi, personasApi } from '@/core/api/administracion.api';
import { Permiso } from '@/core/constants/permisos';
import type { MedioPago, PersonaRegistro, TipoDocumento } from '@/core/types/administracion.types';
import { useAuthStore } from '@/modules/auth/auth.store';
import {
  almacenesApi,
  configuracionesApi,
  inventariosApi,
  productoSucursalApi,
} from '@/modules/logistica/logistica.api';
import type {
  Almacen,
  Inventario,
  Pagina,
  ProductoSucursal,
} from '@/modules/logistica/logistica.types';
import PosCheckoutDialog from '../components/PosCheckoutDialog.vue';
import PersonFormDialog from '@/modules/personas/components/PersonFormDialog.vue';
import { useRealtimeRefresh } from '@/core/realtime/useRealtimeRefresh';
import { cajasApi, ventasApi } from '@/modules/operaciones/operaciones.api';
import {
  abrirTicketVenta,
  cargarTicketVenta,
  reservarVentanaTicket,
} from '@/modules/operaciones/venta-ticket';
import type { Caja, PagoPayload } from '@/modules/operaciones/operaciones.types';
import { useSucursalStore } from '@/shared/stores/sucursal.store';
import ReconocerProductoDialog from '@/modules/reconocimiento/components/ReconocerProductoDialog.vue';
import type {
  CandidatoVisual,
  SeleccionVisual,
} from '@/modules/reconocimiento/reconocimiento.types';
import { draftTotal, usePosDrafts, type PosDraft, type PosLine } from '../pos-drafts';
import { posLineCatalogIssue, posStockByProduct, resolvePosWarehouse } from '../pos-inventory';
import { quantityInputUnit, quantityInputValue, usesGrams } from '@/shared/utils/product-quantity';
import '../pos.css';

const { mdAndUp } = useDisplay();
const mobileProductsSheet = ref(false);
const noteDialog = ref(false);
const auth = useAuthStore();
const branch = useSucursalStore();
const userId = computed(() => auth.usuario?.idUsuario);
const branchId = computed(() => branch.idSucursalActual);
const {
  drafts,
  active,
  waiting,
  activeId,
  storageError,
  create,
  select,
  discard,
  removeConfirmed,
  numberActive,
} = usePosDrafts(userId, branchId);
const products = ref<ProductoSucursal[]>([]);
const warehouses = ref<Almacen[]>([]);
const inventory = ref<Inventario[]>([]);
const openBox = ref<Caja | null>(null);
const negativeStock = ref(false);
const loading = ref(false);
const error = ref('');
const search = ref('');
const categoryId = ref(0);
const waitingDialog = ref(false);
const waitingSearch = ref('');
const discardDialog = ref(false);
const recognitionDialog = ref(false);
const weightDialog = ref(false);
const weightProductId = ref<number | null>(null);
const customerDialog = ref(false);
const customerReference = ref('');
const customerId = ref<number | null>(null);
const clients = ref<PersonaRegistro[]>([]);
const clientsLoading = ref(false);
const clientsError = ref('');
const checkoutDialog = ref(false);
const checkoutError = ref('');
const checkoutSaving = ref(false);
const checkoutLoading = ref(false);
const payments = ref<PagoPayload[]>([]);
const paymentMethods = ref<MedioPago[]>([]);
const paymentMode = ref('cash');
const cashReceived = ref('');
const creditClientId = ref<number | null>(null);
const dueDate = ref('');
const clientFormDialog = ref(false);
const documentTypes = ref<TipoDocumento[]>([]);
const newClientPrefill = ref<Partial<PersonaRegistro> | null>(null);
const notice = reactive({
  show: false,
  message: '',
  color: 'primary',
  ticketId: null as number | null,
  ticketBlocked: false,
});
let catalogRequest = 0;
let clientsRequest = 0;

const canEdit = computed(
  () =>
    auth.puede(Permiso.VENTAS_GESTIONAR) &&
    !!openBox.value &&
    !loading.value &&
    !error.value &&
    !checkoutSaving.value,
);
const total = computed(() => (active.value ? draftTotal(active.value) : 0));
const taxRate = computed(() => Math.max(0, Number(branch.sucursalActual?.perfil?.igv) || 0));
const orderSubtotal = computed(() => total.value / (1 + taxRate.value / 100));
const categories = computed(() => [
  ...new Map(
    products.value.map((product) => [product.producto.idCategoria, product.producto.categoria]),
  ).values(),
]);
const filteredProducts = computed(() => {
  const term = (search.value || '').trim().toLocaleLowerCase('es');
  return products.value
    .filter(
      (product) =>
        (!categoryId.value || product.producto.idCategoria === categoryId.value) &&
        (!term ||
          `${product.producto.nombre} ${product.producto.codigoBarras || ''}`
            .toLocaleLowerCase('es')
            .includes(term)),
    )
    .sort((a, b) => {
      const available = (product: ProductoSucursal) =>
        Number(product.precioVenta) > 0 &&
        (negativeStock.value || stockFor(product.idProductoSucursal) > 0)
          ? 1
          : 0;
      return (
        available(b) - available(a) || a.producto.nombre.localeCompare(b.producto.nombre, 'es')
      );
    });
});
const filteredWaiting = computed(() => {
  const term = (waitingSearch.value || '').trim().toLocaleLowerCase('es');
  return waiting.value.filter((draft) =>
    `${draft.number} ${saleName(draft)}`.toLocaleLowerCase('es').includes(term),
  );
});
const defaultWarehouseId = computed(
  () => resolvePosWarehouse(warehouses.value, null)?.idAlmacen ?? null,
);
// Consultar existencias no requiere abrir caja ni crear una venta.
const catalogWarehouseId = computed(() =>
  resolvePosWarehouse(warehouses.value, active.value?.warehouseId ?? null)?.idAlmacen ?? null,
);
const saleWarehouse = computed(() =>
  warehouses.value.find((warehouse) => warehouse.idAlmacen === catalogWarehouseId.value),
);
const stockByProduct = computed(
  () => posStockByProduct(inventory.value, catalogWarehouseId.value),
);
const weightProduct = computed(() => products.value.find(product => product.idProductoSucursal === weightProductId.value) ?? null);
const weightAvailable = computed(() => negativeStock.value || !weightProduct.value
  ? null
  : quantityLabel(stockFor(weightProduct.value.idProductoSucursal) - quantityInCart(weightProduct.value.idProductoSucursal)));
const cartIssue = computed(() => active.value?.lines.map(lineIssue).find(Boolean) || '');
const paidTotal = computed(
  () =>
    Math.round(
      payments.value.reduce((amount, payment) => amount + (Number(payment.monto) || 0), 0) * 100,
    ) / 100,
);
const cashMethod = computed(() =>
  paymentMethods.value.find((method) => method.nombre.trim().toLowerCase() === 'efectivo'),
);
const cashPayment = computed(() =>
  payments.value
    .filter((payment) => payment.idMedioPago === cashMethod.value?.idMedioPago)
    .reduce((amount, payment) => amount + (Number(payment.monto) || 0), 0),
);
const change = computed(() =>
  cashPayment.value > 0
    ? Math.max(0, Math.round(((Number(cashReceived.value) || 0) - cashPayment.value) * 100) / 100)
    : 0,
);
const receivedIssue = computed(() =>
  cashPayment.value > 0 &&
  (!Number.isFinite(Number(cashReceived.value)) || Number(cashReceived.value) < cashPayment.value)
    ? 'El efectivo recibido debe cubrir el importe aplicado.'
    : '',
);
const paymentIssue = computed(() => {
  if (paidTotal.value > total.value) return 'Los pagos superan el total de la venta.';
  if (paymentMode.value === 'cash' && paidTotal.value < total.value)
    return 'Distribuye el total entre los medios de pago.';
  if (
    paymentMode.value === 'credit' &&
    (!creditClientId.value ||
      clients.value.find((client) => client.id === creditClientId.value)?.esGenerico)
  )
    return 'Selecciona un cliente identificado para el pago pendiente.';
  if (paymentMode.value === 'credit' && paidTotal.value >= total.value)
    return 'El pago pendiente debe dejar un saldo por cobrar.';
  return '';
});

async function allPages<T>(fetchPage: (page: number) => Promise<{ data: Pagina<T> }>) {
  const items: T[] = [];
  let page = 1;
  let count = 0;
  do {
    const response = await fetchPage(page++);
    items.push(...response.data.data);
    count = response.data.total;
    if (!response.data.data.length) break;
  } while (items.length < count);
  return items;
}

async function loadCatalog(background = false) {
  const idSucursal = branchId.value;
  const request = ++catalogRequest;
  if (!background) {
    loading.value = true;
    error.value = '';
    openBox.value = null;
    products.value = [];
    warehouses.value = [];
    inventory.value = [];
  }
  if (!idSucursal) {
    loading.value = false;
    return;
  }
  try {
    const [productData, warehouseData, inventoryData, box, config] = await Promise.all([
      allPages((page) =>
        productoSucursalApi.listar({
          idSucursal,
          estado: true,
          pagina: page,
          limite: 100,
        }),
      ),
      allPages((page) =>
        almacenesApi.listar({
          idSucursal,
          estado: true,
          pagina: page,
          limite: 100,
        }),
      ),
      allPages((page) => inventariosApi.listar({ idSucursal, pagina: page, limite: 100 })),
      cajasApi.abierta(idSucursal).catch((cause) => {
        if (isAxiosError(cause) && cause.response?.status === 404) return null;
        throw cause;
      }),
      configuracionesApi.listar(),
    ]);
    if (request !== catalogRequest) return;
    error.value = '';
    products.value = productData.filter((product) => product.producto.estado);
    warehouses.value = warehouseData;
    inventory.value = inventoryData;
    openBox.value = box?.data ?? null;
    negativeStock.value = config.data.some(
      (item) => item.nombre === 'STOCK_NEGATIVO' && item.activo,
    );
    // Las ventas nuevas usan automáticamente el área de venta de la sucursal.
    // Un almacén eliminado no debe ocultar el stock actual del catálogo.
    // Las líneas guardadas conservan su origen y se validan antes de cobrarlas.
    for (const draft of drafts.value) {
      if (
        !draft.lines.length ||
        !warehouses.value.some(
          (warehouse) => warehouse.idAlmacen === draft.warehouseId && warehouse.estado,
        )
      ) draft.warehouseId = defaultWarehouseId.value;
    }
    if (!active.value && canCreate()) create(defaultWarehouseId.value);
  } catch (cause) {
    if (request === catalogRequest)
      error.value = getApiErrorMessage(
        cause,
        'No se pudieron cargar los productos, el inventario y la caja.',
      );
  } finally {
    if (request === catalogRequest) loading.value = false;
  }
}

function canCreate() {
  return auth.puede(Permiso.VENTAS_GESTIONAR) && !!openBox.value;
}
function saleName(draft: PosDraft) {
  return draft.reference || draft.clientName || 'Clientes varios';
}
function chooseWaiting(id: string) {
  switchSale(id);
  waitingDialog.value = false;
}
function newWaitingSale() {
  newSale();
  waitingDialog.value = false;
}
function money(value: string | number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0);
}
function quantityLabel(value: number) {
  return Math.round(value * 1000) / 1000;
}
function timeLabel(date: string) {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(date));
}
function stockFor(id: number) {
  return stockByProduct.value.get(id) ?? 0;
}
function quantityInCart(id: number) {
  return (
    active.value?.lines
      .filter((line) => line.productId === id)
      .reduce((count, line) => count + line.quantity, 0) ?? 0
  );
}
function showNotice(message: string, color = 'primary') {
  Object.assign(notice, { message, color, show: true, ticketId: null, ticketBlocked: false });
}
function reopenTicket() {
  if (!notice.ticketId) return;
  notice.ticketBlocked = !abrirTicketVenta(notice.ticketId);
  if (notice.ticketBlocked)
    notice.message = 'Venta registrada. Permite las ventanas emergentes para abrir el ticket.';
}
function canAdd(product: ProductoSucursal) {
  const existingLine = active.value?.lines.find(
    (line) => line.productId === product.idProductoSucursal,
  );
  return (
    canEdit.value &&
    !!active.value?.warehouseId &&
    warehouses.value.some((warehouse) => warehouse.idAlmacen === active.value?.warehouseId) &&
    (!existingLine ||
      (!posLineCatalogIssue(existingLine, products.value, warehouses.value) &&
        existingLine.warehouseId === active.value?.warehouseId)) &&
    Number(product.precioVenta) > 0 &&
    (negativeStock.value ||
      quantityInCart(product.idProductoSucursal) < stockFor(product.idProductoSucursal))
  );
}
function openRecognition() {
  mobileProductsSheet.value = false;
  recognitionDialog.value = true;
}
function lineRemaining(line: PosLine) {
  return (
    Number(
      inventory.value.find(
        (item) => item.idProductoSucursal === line.productId && item.idAlmacen === line.warehouseId,
      )?.stock ?? 0,
    ) - line.quantity
  );
}
function lineIssue(line: PosLine) {
  const issue = posLineCatalogIssue(line, products.value, warehouses.value);
  if (issue) return issue;
  const stock = Number(
    inventory.value.find(
      (item) => item.idProductoSucursal === line.productId && item.idAlmacen === line.warehouseId,
    )?.stock ?? 0,
  );
  return !negativeStock.value && line.quantity > stock
    ? `Stock disponible: ${quantityInputValue(stock, line.unit)} ${quantityInputUnit(line.unit)}`
    : '';
}
function newSale() {
  if (!canEdit.value) return;
  create(defaultWarehouseId.value);
  search.value = '';
}
function switchSale(id: string) {
  select(id);
  checkoutDialog.value = false;
}
function holdSale() {
  if (!canEdit.value || !active.value?.lines.length) return;
  newSale();
  showNotice('Venta en espera. Puedes atender al siguiente cliente.');
}
function discardSale() {
  if (!canEdit.value || !active.value) return;
  discard(active.value.id);
  if (!active.value) create(defaultWarehouseId.value);
  discardDialog.value = false;
  showNotice('Carrito descartado.');
}
function addProduct(product: ProductoSucursal) {
  if (!canAdd(product) || !active.value?.warehouseId) return;
  if (usesGrams(product.producto.unidadMedida.simbolo)) {
    weightProductId.value = product.idProductoSucursal;
    mobileProductsSheet.value = false;
    weightDialog.value = true;
    return;
  }
  numberActive();
  const line = active.value.lines.find((item) => item.productId === product.idProductoSucursal);
  const increment = negativeStock.value
    ? 1
    : Math.min(
        1,
        stockFor(product.idProductoSucursal) - quantityInCart(product.idProductoSucursal),
      );
  if (line) line.quantity = quantityLabel(line.quantity + increment);
  else
    active.value.lines.push({
      productId: product.idProductoSucursal,
      productCreatedAt: product.producto.createdAt,
      warehouseId: active.value.warehouseId,
      warehouseCreatedAt: saleWarehouse.value?.createdAt,
      name: product.producto.nombre,
      unit: product.producto.unidadMedida.simbolo,
      quantity: quantityLabel(increment),
      price: Number(product.precioVenta),
    });
}
function visualSelectionIssue(candidate: CandidatoVisual, cantidad: number) {
  const product = products.value.find(
    (item) =>
      item.idProductoSucursal === candidate.idProductoSucursal &&
      item.idProducto === candidate.idProducto,
  );
  if (!product)
    return 'Este producto ya no está disponible en el catálogo. Actualiza los productos.';
  if (!canAdd(product)) return 'Revisa la caja, el almacén, el precio y el stock de este producto.';
  if (Number(product.precioVenta) !== Number(candidate.precioVenta))
    return 'El precio cambió. Actualiza el catálogo y vuelve a buscar.';
  return additionIssue(product, cantidad);
}
function additionIssue(product: ProductoSucursal, cantidad: number) {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return 'Ingresa una cantidad mayor que cero.';
  if (!canAdd(product)) return 'Revisa la caja, el almacén, el precio y el stock de este producto.';
  const line = active.value?.lines.find((item) => item.productId === product.idProductoSucursal);
  if (line && line.price !== Number(product.precioVenta))
    return 'El precio de este producto cambió. Retíralo del carrito y vuelve a agregarlo.';
  if (
    !negativeStock.value &&
    quantityLabel(cantidad + quantityInCart(product.idProductoSucursal)) >
      stockFor(product.idProductoSucursal)
  )
    return 'La cantidad supera el stock disponible en este almacén.';
  if (quantityLabel(cantidad + quantityInCart(product.idProductoSucursal)) > 99999999999.999)
    return 'La cantidad total supera el máximo permitido.';
  return '';
}
function weightSelectionIssue(cantidad: number) {
  const product = weightProduct.value;
  if (!product) return 'El producto ya no está disponible.';
  if (!usesGrams(product.producto.unidadMedida.simbolo))
    return 'La unidad del producto cambió. Cierra esta ventana y vuelve a seleccionarlo.';
  return additionIssue(product, cantidad);
}
function addWeight(cantidad: number) {
  const product = weightProduct.value;
  if (!weightDialog.value || !product || weightSelectionIssue(cantidad)) return;
  appendProduct(product, cantidad);
  weightDialog.value = false;
}
function addVisualProduct({ candidato, cantidad }: SeleccionVisual) {
  const issue = visualSelectionIssue(candidato, cantidad);
  if (issue) {
    showNotice(issue, 'warning');
    return;
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0 || !active.value?.warehouseId) return;
  const product = products.value.find(
    (item) => item.idProductoSucursal === candidato.idProductoSucursal,
  );
  if (!product) return;
  appendProduct(product, cantidad);
  recognitionDialog.value = false;
  showNotice(`${product.producto.nombre} agregado al carrito.`, 'success');
}
function appendProduct(product: ProductoSucursal, cantidad: number) {
  if (!active.value?.warehouseId) return;
  numberActive();
  const line = active.value.lines.find((item) => item.productId === product.idProductoSucursal);
  if (line) line.quantity = quantityLabel(line.quantity + cantidad);
  else
    active.value.lines.push({
      productId: product.idProductoSucursal,
      productCreatedAt: product.producto.createdAt,
      warehouseId: active.value.warehouseId,
      warehouseCreatedAt: saleWarehouse.value?.createdAt,
      name: product.producto.nombre,
      unit: product.producto.unidadMedida.simbolo,
      quantity: cantidad,
      price: Number(product.precioVenta),
    });
}
function removeLine(line: PosLine) {
  if (canEdit.value && active.value)
    active.value.lines = active.value.lines.filter((item) => item !== line);
}
function setQuantity(line: PosLine, quantity: number) {
  if (!canEdit.value || !Number.isFinite(quantity) || quantity <= 0 || quantity > 99999999999.999)
    return false;
  const issue = posLineCatalogIssue(line, products.value, warehouses.value);
  if (issue) {
    showNotice(issue, 'warning');
    return false;
  }
  const next = quantityLabel(quantity);
  if (next <= 0) return false;
  if (!negativeStock.value && next > stockFor(line.productId)) {
    showNotice('La cantidad supera el stock disponible.', 'warning');
    return false;
  }
  line.quantity = next;
  return true;
}
function adjustQuantity(line: PosLine, step: number) {
  if (line.quantity + step <= 0) removeLine(line);
  else setQuantity(line, line.quantity + step);
}
function addByBarcode() {
  const code = (search.value || '').trim();
  if (!code) return;
  const matches = products.value.filter((product) => product.producto.codigoBarras === code);
  const product =
    matches.length === 1
      ? matches[0]
      : filteredProducts.value.length === 1
        ? filteredProducts.value[0]
        : undefined;
  if (!product) {
    showNotice(
      matches.length > 1
        ? 'Hay varios productos con ese código. Selecciona el correcto.'
        : 'Selecciona un producto de los resultados.',
      'warning',
    );
    return;
  }
  if (!canAdd(product)) {
    showNotice('Revisa el almacén, la caja, el precio y el stock del producto.', 'warning');
    return;
  }
  addProduct(product);
  search.value = '';
}

async function loadClients() {
  if (!auth.puede(Permiso.PERSONAS_VER)) return;
  const request = ++clientsRequest;
  clientsLoading.value = true;
  clientsError.value = '';
  try {
    const response = await personasApi.listar('CLIENTE');
    if (request === clientsRequest) clients.value = response.data.filter((client) => client.activo);
  } catch (cause) {
    if (request === clientsRequest)
      clientsError.value = getApiErrorMessage(cause, 'No se pudieron cargar los clientes.');
  } finally {
    if (request === clientsRequest) clientsLoading.value = false;
  }
}
function openCustomer() {
  if (!canEdit.value || !active.value) return;
  customerReference.value = active.value.reference;
  customerId.value = active.value.clientId;
  customerDialog.value = true;
  void loadClients();
}
function saveCustomer() {
  if (!canEdit.value || !active.value) return;
  const previousClientId = active.value.clientId;
  active.value.reference = customerReference.value.trim();
  active.value.clientId = customerId.value;
  active.value.clientName =
    clients.value.find((client) => client.id === customerId.value)?.nombre ??
    (customerId.value === previousClientId ? active.value.clientName : '');
  customerDialog.value = false;
}
async function openCheckout() {
  if (!canEdit.value || !active.value?.lines.length || cartIssue.value) return;
  mobileProductsSheet.value = false;
  checkoutDialog.value = true;
  checkoutError.value = '';
  payments.value = [];
  paymentMode.value = 'cash';
  cashReceived.value = '';
  creditClientId.value =
    active.value.clientId ?? clients.value.find((client) => client.esGenerico)?.id ?? null;
  dueDate.value = '';
  const saleId = active.value.id;
  checkoutLoading.value = true;
  try {
    const [response] = await Promise.all([mediosPagoApi.listar(), loadClients()]);
    creditClientId.value ??= clients.value.find((client) => client.esGenerico)?.id ?? null;
    if (!checkoutDialog.value || active.value?.id !== saleId) return;
    paymentMethods.value = response.data.filter(
      (method) => method.nombre.trim().toLowerCase() !== 'fraccionado',
    );
    const first = cashMethod.value ?? paymentMethods.value[0];
    if (first) payments.value = [{ idMedioPago: first.idMedioPago, monto: total.value.toFixed(2) }];
    cashReceived.value = total.value.toFixed(2);
  } catch (cause) {
    if (active.value?.id === saleId)
      checkoutError.value = getApiErrorMessage(cause, 'No se pudieron cargar los medios de pago.');
  } finally {
    checkoutLoading.value = false;
  }
}
async function registerSale() {
  if (
    checkoutSaving.value ||
    checkoutLoading.value ||
    !canEdit.value ||
    !checkoutDialog.value ||
    !active.value?.lines.length ||
    cartIssue.value ||
    paymentIssue.value ||
    receivedIssue.value ||
    !openBox.value ||
    !branchId.value ||
    !userId.value
  )
    return;
  const draft = active.value,
    branch = branchId.value,
    user = userId.value,
    box = openBox.value.idCaja;
  const payload = {
    idCliente: creditClientId.value ?? undefined,
    claveOperacion: draft.id,
    idCaja: box,
    idSucursal: branch,
    monto: total.value.toFixed(2),
    ...(cashPayment.value > 0 ? { efectivoRecibido: Number(cashReceived.value).toFixed(2) } : {}),
    detalle: draft.note.trim() || draft.reference || undefined,
    productos: draft.lines.map((line) => ({
      idProductoSucursal: line.productId,
      idAlmacen: line.warehouseId,
      cantidad: line.quantity.toFixed(3),
      precioUnitario: line.price.toFixed(4),
    })),
    pagos: payments.value.map((payment) => ({
      idMedioPago: payment.idMedioPago,
      monto: Number(payment.monto).toFixed(2),
    })),
    ...(paymentMode.value === 'credit'
      ? {
          credito: {
            idCliente: creditClientId.value,
            fechaVencimiento: dueDate.value || undefined,
          },
        }
      : {}),
  };
  checkoutSaving.value = true;
  checkoutError.value = '';
  const ticketWindow = reservarVentanaTicket();
  try {
    const { data } = await ventasApi.crear(payload);
    removeConfirmed(draft.id, user, branch);
    checkoutDialog.value = false;
    showNotice('Venta registrada correctamente.', 'success');
    notice.ticketId = data.venta.idIngreso;
    notice.ticketBlocked = !cargarTicketVenta(ticketWindow, data.venta.idIngreso);
    if (notice.ticketBlocked) notice.message = 'Venta registrada. Pulsa Ver ticket para abrirlo.';
    await loadCatalog();
  } catch (cause) {
    ticketWindow?.close();
    if (active.value?.id === draft.id)
      checkoutError.value = getApiErrorMessage(
        cause,
        'No se pudo confirmar la venta. Puedes reintentar este mismo carrito.',
      );
    else
      showNotice(
        getApiErrorMessage(cause, 'No se pudo confirmar la venta. Revisa su sucursal.'),
        'error',
      );
  } finally {
    checkoutSaving.value = false;
  }
}
async function openClientCreation(document = '') {
  if (!auth.puede(Permiso.PERSONAS_GESTIONAR) || checkoutSaving.value) return;
  try {
    documentTypes.value = (await documentosApi.tipos()).data.filter((type) =>
      ['DNI', 'RUC', 'CE'].includes(type.nombre),
    );
    const name = document.length === 11 ? 'RUC' : 'DNI';
    newClientPrefill.value = {
      numeroDocumento: document,
      idTipoDocumento: documentTypes.value.find((type) => type.nombre === name)?.idTipoDocumento,
    };
    clientFormDialog.value = true;
  } catch (cause) {
    checkoutError.value = getApiErrorMessage(
      cause,
      'No se pudieron cargar los tipos de documento.',
    );
  }
}
function clientCreated(client: PersonaRegistro) {
  clients.value = [client, ...clients.value.filter((item) => item.id !== client.id)];
  creditClientId.value = client.id;
  if (active.value) {
    active.value.clientId = client.id;
    active.value.clientName = client.nombre;
  }
}
useRealtimeRefresh(
  ['caja', 'stock'],
  () => loadCatalog(true),
  (change) => change.idSucursal === branchId.value,
);
useRealtimeRefresh(['clientes'], loadClients, (change) => change.idSucursal === branchId.value);

function keyboardShortcuts(event: KeyboardEvent) {
  const target = event.target;
  const isTyping =
    target instanceof HTMLElement &&
    (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
  if (
    weightDialog.value ||
    recognitionDialog.value ||
    checkoutDialog.value ||
    customerDialog.value ||
    waitingDialog.value ||
    discardDialog.value ||
    noteDialog.value ||
    isTyping
  )
    return;
  if (event.key === 'F2') {
    event.preventDefault();
    if (!mdAndUp.value) mobileProductsSheet.value = true;
    void Promise.resolve().then(() =>
      (
        document.querySelector('[aria-label="Buscar productos"]') as HTMLInputElement | null
      )?.focus(),
    );
  } else if (event.key === 'F10') {
    event.preventDefault();
    void openCheckout();
  } else if (event.altKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    newSale();
  }
}

watch(
  branchId,
  () => {
    weightDialog.value = false;
    recognitionDialog.value = false;
    checkoutDialog.value =
      customerDialog.value =
      waitingDialog.value =
      discardDialog.value =
      clientFormDialog.value =
      mobileProductsSheet.value =
      noteDialog.value =
        false;
    search.value = '';
    categoryId.value = 0;
    void loadCatalog();
    void loadClients();
  },
  { immediate: true },
);
watch(mdAndUp, (value) => {
  if (value) mobileProductsSheet.value = false;
});
watch([activeId, () => active.value?.warehouseId, canEdit], () => {
  recognitionDialog.value = false;
  weightDialog.value = false;
});
watch(creditClientId, (id) => {
  if (!checkoutDialog.value || checkoutSaving.value || !active.value) return;
  const client = clients.value.find((item) => item.id === id);
  active.value.clientId = client?.id ?? null;
  active.value.clientName = client?.nombre ?? '';
});
onMounted(() => window.addEventListener('keydown', keyboardShortcuts));
onBeforeUnmount(() => {
  catalogRequest++;
  clientsRequest++;
  window.removeEventListener('keydown', keyboardShortcuts);
});
</script>
