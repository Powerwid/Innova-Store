<template>
  <ModuleFoundation
    title="Usuarios"
    description="Administra las cuentas, su rol único y las sucursales en las que puede trabajar cada usuario."
    icon="mdi-account-group-outline"
    action-label="Nuevo usuario"
    action-icon="mdi-account-plus-outline"
    pending-message="El backend ya cuenta con las operaciones principales de usuarios; falta construir su tabla y formularios definitivos."
  />
</template>

<script setup lang="ts">
import ModuleFoundation from '@/shared/components/feedback/ModuleFoundation.vue'
</script>
