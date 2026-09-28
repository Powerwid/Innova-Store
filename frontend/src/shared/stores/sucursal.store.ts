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
        nombre: sucursales.value.find((item) => item.idSucursal === idSucursal)?.nombre ?? `Sucursal #${idSucursal}`,
      }))

      const seleccionValida = sucursales.value.some(
        (item) => item.idSucursal === idSucursalActual.value,
      )
      if (!seleccionValida) idSucursalActual.value = sucursales.value[0]?.idSucursal ?? null
    }

    function actualizarNombres(items: SucursalAsignada[]) {
      sucursales.value = sucursales.value.map((item) => items.find((candidate) => candidate.idSucursal === item.idSucursal) ?? item)
    }

    function reemplazarDisponibles(items: SucursalAsignada[]) {
      const unicas = new Map(items.map((item) => [item.idSucursal, item]))
      sucursales.value = [...unicas.values()]

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

    return {
      idSucursalActual,
      sucursales,
      sucursalActual,
      sincronizar,
      actualizarNombres,
      reemplazarDisponibles,
      seleccionar,
    }
  },
  { persist: { pick: ['idSucursalActual'] } },
)
