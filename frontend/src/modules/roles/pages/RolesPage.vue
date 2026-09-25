<template>
  <ModuleFoundation title="Roles y permisos"
    description="Crea roles y determina las capacidades que heredarán todos los usuarios asignados a cada rol."
    icon="mdi-shield-account-outline" action-label="Nuevo rol" action-icon="mdi-shield-plus-outline"
    pending-message="La API de roles y permisos está disponible para SUPERADMIN; la siguiente etapa incorporará la matriz de asignación." />
</template>

<script setup lang="ts">
import ModuleFoundation from '@/shared/components/feedback/ModuleFoundation.vue'
</script>
