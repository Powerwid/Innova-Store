<template>
  <div>
    <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
          <v-icon size="18">{{ icon }}</v-icon>
          {{ eyebrow }}
        </div>
        <h1 class="text-2xl font-black tracking-tight text-secondary sm:text-3xl">{{ title }}</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-medium-emphasis">{{ description }}</p>
      </div>
      <v-btn v-if="actionLabel" color="primary" size="large" :prepend-icon="actionIcon" disabled>
        {{ actionLabel }}
      </v-btn>
    </div>

    <v-card border class="overflow-hidden">
      <div class="border-b px-5 py-4 sm:px-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="font-bold">Estructura del módulo preparada</div>
            <div class="mt-1 text-xs text-medium-emphasis">La vista ya participa del layout, rutas y permisos.</div>
          </div>
          <v-chip color="warning" variant="tonal" prepend-icon="mdi-progress-wrench">API pendiente</v-chip>
        </div>
      </div>

      <div class="grid min-h-[360px] place-items-center p-8 text-center">
        <div class="max-w-md">
          <v-avatar color="primary" variant="tonal" size="76" class="mb-5">
            <v-icon size="36">{{ icon }}</v-icon>
          </v-avatar>
          <h2 class="text-xl font-black text-secondary">Listo para conectar</h2>
          <p class="mt-3 text-sm leading-6 text-medium-emphasis">
            {{ pendingMessage }} La interfaz final se construirá cuando completemos el contrato correspondiente en NestJS.
          </p>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description: string
    icon: string
    actionLabel?: string
    actionIcon?: string
    pendingMessage: string
  }>(),
  { eyebrow: 'Administración', actionLabel: '', actionIcon: 'mdi-plus' },
)
</script>
