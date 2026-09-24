<template>
  <div class="grid min-h-[calc(100vh-12rem)] place-items-center text-center">
    <div class="max-w-md">
      <v-avatar color="warning" variant="tonal" size="88" class="mb-6">
        <v-icon size="44">mdi-shield-lock-outline</v-icon>
      </v-avatar>
      <h1 class="text-3xl font-black tracking-tight text-secondary">Acceso restringido</h1>
      <p class="mt-3 leading-7 text-medium-emphasis">
        Tu rol no cuenta con el permiso requerido para consultar este módulo.
      </p>
      <v-btn class="mt-7" color="primary" size="large" :to="{ name: 'dashboard' }">
        Volver al panel
      </v-btn>
    </div>
  </div>
</template>
