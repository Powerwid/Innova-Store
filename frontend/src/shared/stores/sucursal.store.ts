import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface SucursalAsignada {
  idSucursal: number
  nombre: string
}

export const useSucursalStore = defineStore(
  'sucursal',
  () => {
    const idSucursalActual = ref<number | null>(null)
    const sucursales = ref<SucursalAsignada[]>([])

    const sucursalActual = computed(
      () => sucursales.value.find((item) => item.idSucursal === idSucursalActual.value) ?? null,
    )

    function sincronizar(ids: number[]) {
      sucursales.value = ids.map((idSucursal) => ({
        idSucursal,
        nombre: `Sucursal #${idSucursal}`,
      }))

      const seleccionValida = sucursales.value.some(
        (item) => item.idSucursal === idSucursalActual.value,
      )
      if (!seleccionValida) idSucursalActual.value = sucursales.value[0]?.idSucursal ?? null
    }

    function seleccionar(idSucursal: number) {
      if (sucursales.value.some((item) => item.idSucursal === idSucursal)) {
        idSucursalActual.value = idSucursal
      }
    }

    return { idSucursalActual, sucursales, sucursalActual, sincronizar, seleccionar }
  },
  { persist: { pick: ['idSucursalActual'] } },
)
