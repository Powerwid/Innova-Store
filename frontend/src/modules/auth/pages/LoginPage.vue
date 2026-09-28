<template>
  <v-container
    fluid
    class="fill-height pa-4 d-flex align-center justify-center relative login-bg"
  >
    <div class="overlay" />

    <v-fade-transition appear>
      <v-card
        elevation="12"
        rounded="xl"
        class="w-100 pa-6 pa-sm-8 content-card bg-surface"
        max-width="460"
      >
        <v-card-item class="text-center pa-0 mb-6">
          <div class="brand-title justify-center">
            <span class="innova-text">INNOVA</span>
            <span class="sistemas-text">STORE</span>
          </div>

          <v-divider class="my-5" />

          <v-alert
            v-if="reasonMessage"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4 text-start"
            closable
            @click:close="reasonMessage = ''"
          >
            <v-icon start size="18">
              mdi-information
            </v-icon>

            {{ reasonMessage }}
          </v-alert>

          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4 text-start"
            closable
            @click:close="errorMessage = ''"
          >
            {{ errorMessage }}
          </v-alert>

          <h1 class="text-h5 font-weight-bold mt-2 text-primary">
            Innova Store Admin
          </h1>

          <p class="text-caption text-medium-emphasis">
            Sistema de Gestión de Tiendas
          </p>
        </v-card-item>

        <v-card-text class="pa-0">
          <v-form @submit.prevent="submitLogin">
            <v-text-field
              v-model="form.correo"
              label="Correo electrónico"
              type="email"
              autocomplete="email"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              class="mb-3"
              prepend-inner-icon="mdi-email-outline"
              color="primary"
              :error-messages="errors.correo"
              @update:model-value="errors.correo = ''"
            />

            <v-text-field
              v-model="form.contrasena"
              label="Contraseña"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              prepend-inner-icon="mdi-lock-outline"
              color="primary"
              :error-messages="errors.contrasena"
              @update:model-value="errors.contrasena = ''"
            >
              <template #append-inner>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  tabindex="-1"
                  @click="showPassword = !showPassword"
                >
                  <v-icon>
                    {{ showPassword ? 'mdi-eye' : 'mdi-eye-off' }}
                  </v-icon>
                </v-btn>
              </template>
            </v-text-field>

            <v-divider class="my-5" />

            <v-btn
              type="submit"
              :loading="authStore.cargando"
              block
              size="x-large"
              height="52"
              color="primary"
              rounded="lg"
              elevation="3"
              class="text-none font-weight-bold text-subtitle-1"
            >
              Ingresar al sistema

              <v-icon end>
                mdi-arrow-right
              </v-icon>
            </v-btn>
          </v-form>

          <div
            class="theme-selector mt-8 d-flex align-center justify-center bg-surface rounded-pill pa-2 border"
          >
            <v-icon
              size="18"
              class="me-2 text-medium-emphasis"
            >
              mdi-theme-light-dark
            </v-icon>

            <span class="text-caption font-weight-bold me-4">
              Modo {{ isDark ? 'Oscuro' : 'Claro' }}
            </span>

            <v-switch
              v-model="isDark"
              inset
              hide-details
              density="compact"
              color="primary"
            />
          </div>

          <p
            class="text-center text-caption mt-6 text-medium-emphasis font-weight-medium mb-0"
          >
            © {{ currentYear }} Innova Negocios • Store v1.0.0
          </p>
        </v-card-text>
      </v-card>
    </v-fade-transition>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiErrorMessage } from '@/core/api/api-error'
import { useUiStore } from '@/shared/stores/ui.store'
import { useAuthStore } from '../auth.store'
import { loginSchema, type LoginForm } from '../schemas/login.schema'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()
const currentYear = new Date().getFullYear()

const form = reactive<LoginForm>({
  correo: '',
  contrasena: '',
})

const errors = reactive<Record<keyof LoginForm, string>>({
  correo: '',
  contrasena: '',
})

const showPassword = ref(false)
const errorMessage = ref('')
const reasonMessage = ref('')

const isDark = computed({
  get: () => uiStore.darkMode,

  set: (value: boolean) =>
    uiStore.setTheme(value ? 'storeDark' : 'storeEmerald'),
})

onMounted(() => {
  if (route.query.reason === 'expired') {
    reasonMessage.value = 'Tu sesión expiró. Ingresa nuevamente.'
  }

  if (route.query.reason === 'logout') {
    reasonMessage.value = 'La sesión se cerró correctamente.'
  }
})

async function submitLogin() {
  errorMessage.value = ''
  errors.correo = ''
  errors.contrasena = ''

  const result = loginSchema.safeParse(form)

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof LoginForm

      if (field && !errors[field]) {
        errors[field] = issue.message
      }
    }

    return
  }

  try {
    await authStore.login(result.data)

    const redirect =
      typeof route.query.redirect === 'string'
        ? route.query.redirect
        : '/'

    await router.replace(redirect)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(
      error,
      'No fue posible iniciar sesión',
    )
  }
}
</script>

<style scoped>
.login-bg {
  position: relative;
  background-image: url('/img/bg_fondo_rustico.jpg');
  background-size: 100% auto;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1;
}

.content-card {
  position: relative;
  z-index: 2;
}

.brand-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1.4rem;
  line-height: 1.2;
  letter-spacing: 0.5px;
}

.innova-text {
  font-weight: 900;
  color: rgb(var(--v-theme-primary));
}

.sistemas-text {
  font-weight: 300;
  opacity: 0.85;
}

.theme-selector {
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.theme-selector
  :deep(.v-selection-control:not(.v-selection-control--dirty) .v-switch__track) {
  background-color: #757575 !important;
  opacity: 0.55 !important;
}
</style>