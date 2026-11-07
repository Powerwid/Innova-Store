import { onBeforeUnmount } from 'vue'
import {
  useRealtimeStore,
  type CambioRealtime,
  type RecursoRealtime,
} from './realtime.store'

// Agrupa ráfagas y evita que dos refrescos simultáneos sobrescriban datos.
export function useRealtimeRefresh(
  resources: RecursoRealtime[],
  refresh: () => Promise<unknown>,
  accepts: (change: CambioRealtime) => boolean = () => true,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false,
    pending = false,
    disposed = false
  async function run() {
    timer = undefined
    if (disposed) return
    if (running) {
      pending = true
      return
    }
    running = true
    try {
      await refresh()
    } catch {
      /* La pantalla presenta los errores de su API. */
    } finally {
      running = false
      if (pending && !disposed) {
        pending = false
        timer = setTimeout(() => {
          void run()
        }, 180)
      }
    }
  }
  const unsubscribe = useRealtimeStore().subscribe((change) => {
    if (
      !accepts(change) ||
      !change.recursos.some((resource) => resources.includes(resource))
    )
      return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void run()
    }, 180)
  })
  onBeforeUnmount(() => {
    disposed = true
    unsubscribe()
    if (timer) clearTimeout(timer)
  })
}
