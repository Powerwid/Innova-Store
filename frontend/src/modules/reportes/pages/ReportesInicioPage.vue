<template>
  <div>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Selecciona el reporte que deseas consultar. Cada uno tiene sus propios filtros y formatos de
      exportación.
    </p>
    <v-row>
      <v-col
        v-for="report in availableReports"
        :key="report.type"
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card
          :to="{ name: report.routeName }"
          border
          elevation="0"
          rounded="xl"
          height="100%"
        >
          <v-card-text class="pa-6">
            <v-avatar
              color="primary"
              variant="tonal"
              rounded="lg"
              size="48"
              class="mb-5"
            >
              <v-icon
                :icon="report.icon"
                size="28"
              />
            </v-avatar>
            <h2 class="text-h6 font-weight-bold mb-3">{{ report.title }}</h2>
            <p class="text-body-2 text-medium-emphasis mb-5">{{ report.subtitle }}</p>
            <span class="text-primary d-flex align-center ga-2">
              Abrir reporte
              <v-icon size="18">mdi-arrow-right</v-icon>
            </span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { reportesConfig } from '../reportes.config';
const auth = useAuthStore();
const availableReports = computed(() =>
  reportesConfig.filter((report) => report.type !== 'caja' && auth.puede(report.permission)),
);
</script>
