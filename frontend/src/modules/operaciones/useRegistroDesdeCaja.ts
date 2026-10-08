import { watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Caja } from './operaciones.types'

// Los accesos del detalle conservan la caja elegida y reutilizan su formulario.
export function useRegistroDesdeCaja(caja: Ref<Caja | null>, loading: Ref<boolean>, canManage: Ref<boolean>, error: Ref<string>, abrir: () => void | Promise<void>) {
  const route = useRoute(), router = useRouter()
  let processing = false
  watch([loading, caja, () => route.query.registrar], async () => {
    if (loading.value || processing || route.query.registrar !== '1') return
    processing = true
    const idCaja = Number(route.query.idCaja)
    const valido = canManage.value && caja.value && Number.isInteger(idCaja) && idCaja > 0 && caja.value.idCaja === idCaja
    const query = { ...route.query }
    delete query.registrar; delete query.idCaja
    await router.replace({ query })
    if (valido) await abrir()
    else error.value = 'No puedes registrar en esta caja: está cerrada, cambió o no tienes permiso.'
    processing = false
  }, { immediate: true })
}
