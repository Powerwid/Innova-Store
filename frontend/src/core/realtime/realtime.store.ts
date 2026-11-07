import { ref } from 'vue'
import { defineStore } from 'pinia'
import { io, type Socket } from 'socket.io-client'
import { authApi } from '@/modules/auth/api/auth.api'

export type RecursoRealtime =
  | 'caja'
  | 'ventas'
  | 'ingresos'
  | 'egresos'
  | 'compras'
  | 'deudas'
  | 'stock'
  | 'clientes'
export interface CambioRealtime {
  idSucursal: number
  recursos: RecursoRealtime[]
}
const allResources: RecursoRealtime[] = [
  'caja',
  'ventas',
  'ingresos',
  'egresos',
  'compras',
  'deudas',
  'stock',
  'clientes',
]

export const useRealtimeStore = defineStore('realtime', () => {
  const conectado = ref(false)
  const listeners = new Set<(change: CambioRealtime) => void>()
  let socket: Socket | null = null
  let retry: ReturnType<typeof setTimeout> | undefined

  function publish(change: CambioRealtime) {
    for (const listener of listeners) listener(change)
  }
  function disconnect() {
    if (retry) clearTimeout(retry)
    retry = undefined
    socket?.removeAllListeners()
    socket?.disconnect()
    socket = null
    conectado.value = false
  }
  function connect(idSucursal: number) {
    disconnect()
    const current = io('/tiempo-real', {
      path: '/socket.io',
      withCredentials: true,
      auth: { idSucursal },
    })
    socket = current
    current.on('connect', () => {
      conectado.value = true
      // También se ejecuta al reconectar: recupera los cambios perdidos.
      publish({ idSucursal, recursos: allResources })
    })
    current.on('datos:actualizados', (change: CambioRealtime) => {
      if (change?.idSucursal === idSucursal && Array.isArray(change.recursos))
        publish({
          idSucursal,
          recursos: change.recursos.filter((resource) =>
            allResources.includes(resource),
          ),
        })
    })
    const renew = () => {
      if (retry || socket !== current) return
      retry = setTimeout(() => {
        retry = undefined
        void authApi.me().then(
          () => {
            if (socket === current) current.connect()
          },
          () => {
            if (socket === current) renew()
          },
        )
      }, 3000)
    }
    current.on('disconnect', (reason: string) => {
      conectado.value = false
      if (reason === 'io server disconnect') renew()
    })
    current.on('connect_error', () => {
      conectado.value = false
      renew()
    })
  }
  function subscribe(listener: (change: CambioRealtime) => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
  return { conectado, connect, disconnect, subscribe }
})
