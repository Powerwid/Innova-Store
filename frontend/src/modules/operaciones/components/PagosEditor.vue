<template>
  <div>
    <div class="d-flex align-center mb-2"><div class="font-weight-bold">Distribución del pago</div><v-spacer/><v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-plus" :disabled="available.length===0" @click="add">Agregar medio</v-btn></div>
    <v-alert v-if="!medios.length" type="warning" variant="tonal" density="compact" class="mb-3">No hay medios de pago disponibles.</v-alert>
    <div v-for="(pago,index) in modelValue" :key="index" class="d-flex ga-2 align-start mb-2">
      <v-select :model-value="pago.idMedioPago" :items="optionsFor(index)" item-title="nombre" item-value="idMedioPago" label="Medio de pago" variant="outlined" density="comfortable" hide-details class="flex-grow-1" @update:model-value="update(index,'idMedioPago',Number($event))"/>
      <v-text-field :model-value="pago.monto" label="Monto" prefix="S/" type="number" min="0.01" step="0.01" variant="outlined" density="comfortable" hide-details style="max-width:160px" @update:model-value="update(index,'monto',String($event??''))"/>
      <v-btn icon="mdi-delete-outline" color="error" variant="text" class="mt-1" aria-label="Quitar pago" @click="remove(index)"/>
    </div>
    <div class="d-flex justify-end text-body-2 mt-2">Total distribuido: <strong class="ms-2 money">{{ currency(total) }}</strong></div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { MedioPago } from '@/core/types/administracion.types'
import type { PagoPayload } from '../operaciones.types'
const props=defineProps<{modelValue:PagoPayload[];medios:MedioPago[]}>(),emit=defineEmits<{(e:'update:modelValue',value:PagoPayload[]):void}>()
const medios=computed(()=>props.medios.filter(x=>x.nombre.trim().toLowerCase()!=='fraccionado'))
const used=computed(()=>new Set(props.modelValue.map(x=>x.idMedioPago)))
const available=computed(()=>medios.value.filter(x=>!used.value.has(x.idMedioPago)))
const total=computed(()=>props.modelValue.reduce((sum,x)=>sum+(Number(x.monto)||0),0))
function optionsFor(index:number){return medios.value.filter(x=>x.idMedioPago===props.modelValue[index]?.idMedioPago||!used.value.has(x.idMedioPago))}
function add(){const first=available.value[0];if(first)emit('update:modelValue',[...props.modelValue,{idMedioPago:first.idMedioPago,monto:''}])}
function update(index:number,key:keyof PagoPayload,value:number|string){emit('update:modelValue',props.modelValue.map((x,i)=>i===index?{...x,[key]:value}:x))}
function remove(index:number){emit('update:modelValue',props.modelValue.filter((_,i)=>i!==index))}
function currency(value:number){return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(value)}
</script>
