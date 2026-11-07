import { computed, ref, watch, type Ref } from 'vue'
import { z } from 'zod'

const lineSchema = z.object({
  productId: z.number().int().positive(),
  productCreatedAt: z.iso.datetime().optional(),
  warehouseId: z.number().int().positive(),
  warehouseCreatedAt: z.iso.datetime().optional(),
  name: z.string(),
  unit: z.string(),
  quantity: z.number().positive().max(99999999999.999),
  price: z.number().positive().max(9999999999.9999),
})
const draftSchema = z.object({
  id: z.string(),
  number: z.number().int().nonnegative(),
  reference: z.string().max(100),
  clientId: z.number().int().positive().nullable(),
  clientName: z.string(),
  note: z.string().max(500),
  warehouseId: z.number().int().positive().nullable(),
  onHold: z.boolean(),
  openedAt: z.iso.datetime(),
  lines: z.array(lineSchema),
})
const sessionSchema = z.object({
  version: z.literal(1),
  activeId: z.string().nullable(),
  nextNumber: z.number().int().positive(),
  drafts: z.array(draftSchema),
})

export type PosLine = z.infer<typeof lineSchema>
export type PosDraft = z.infer<typeof draftSchema>

function createDraftId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // En HTTP por IP no hay randomUUID; getRandomValues sigue disponible.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function draftTotal(draft: PosDraft) {
  return Math.round(draft.lines.reduce((total, line) => total + line.quantity * line.price, 0) * 100) / 100
}

// Los carritos pendientes pertenecen a este navegador, usuario y sucursal.
export function usePosDrafts(userId: Ref<number | undefined>, branchId: Ref<number | null>) {
  const drafts = ref<PosDraft[]>([])
  const activeId = ref<string | null>(null)
  const nextNumber = ref(1)
  const storageError = ref('')
  let storageKey = ''
  let hydrating = false
  const active = computed(() => drafts.value.find(draft => draft.id === activeId.value) ?? null)
  const waiting = computed(() => drafts.value.filter(draft => draft.id !== activeId.value && draft.onHold))

  watch([userId, branchId], ([user, branch]) => {
    hydrating = true
    storageKey = user && branch ? `innova-store:pos:v1:${user}:${branch}` : ''
    drafts.value = []
    activeId.value = null
    nextNumber.value = 1
    storageError.value = ''
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const result = sessionSchema.safeParse(JSON.parse(raw))
          if (!result.success) throw new Error('Invalid draft session')
          drafts.value = result.data.drafts
          activeId.value = result.data.activeId
          nextNumber.value = Math.max(result.data.nextNumber, ...drafts.value.map(draft => draft.number + 1))
        }
      } catch {
        storageError.value = 'No se pudieron recuperar las ventas guardadas en este navegador.'
      }
    }
    hydrating = false
  }, { immediate: true, flush: 'sync' })

  watch([drafts, activeId, nextNumber], () => {
    if (hydrating || !storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, drafts: drafts.value, activeId: activeId.value, nextNumber: nextNumber.value }))
    } catch {
      storageError.value = 'No se pudieron guardar las ventas. Mantén esta página abierta para conservarlas.'
    }
  }, { deep: true, flush: 'sync' })

  function parkActive() {
    const current = active.value
    if (!current) return
    if (current.lines.length) current.onHold = true
    else drafts.value = drafts.value.filter(draft => draft.id !== current.id)
  }

  function create(warehouseId: number | null) {
    if (!storageKey) return
    // Nueva venta reutiliza el carrito vacío; no consume una numeración.
    if (active.value && !active.value.lines.length) {
      active.value.onHold = false
      active.value.warehouseId = warehouseId
      return
    }
    parkActive()
    const draft: PosDraft = {
      id: createDraftId(), number: 0, reference: '',
      clientId: null, clientName: '', note: '', warehouseId, onHold: false,
      openedAt: new Date().toISOString(), lines: [],
    }
    drafts.value.push(draft)
    activeId.value = draft.id
  }

  function numberActive() {
    if (active.value && active.value.number === 0) active.value.number = nextNumber.value++
  }

  function select(id: string) {
    if (id === activeId.value) return
    const target = drafts.value.find(draft => draft.id === id)
    if (!target) return
    parkActive()
    target.onHold = false
    activeId.value = id
  }

  function discard(id: string) {
    const wasActive = activeId.value === id
    drafts.value = drafts.value.filter(draft => draft.id !== id)
    if (wasActive) {
      activeId.value = drafts.value[0]?.id ?? null
      if (active.value) active.value.onHold = false
    }
  }

  function removeConfirmed(id: string, user: number, branch: number) {
    const key = `innova-store:pos:v1:${user}:${branch}`
    if (key === storageKey) { discard(id); return }
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const session = sessionSchema.parse(JSON.parse(raw))
      session.drafts = session.drafts.filter(draft => draft.id !== id)
      if (session.activeId === id) session.activeId = session.drafts[0]?.id ?? null
      localStorage.setItem(key, JSON.stringify(session))
    } catch { storageError.value = 'La venta fue registrada, pero no se pudo retirar su carrito guardado. Revisa el historial antes de reintentar.' }
  }
  return { drafts, active, waiting, activeId, storageError, create, select, discard, removeConfirmed, numberActive }
}
