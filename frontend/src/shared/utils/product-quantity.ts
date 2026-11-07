// El catálogo, los precios y la API conservan la unidad base del producto.
// Para KG, el operador escribe gramos enteros: 1 g es la precisión de 0.001 kg.
export const MAX_PRODUCT_QUANTITY = 99999999999.999

export function usesGrams(unit: string) {
  return unit.trim().toUpperCase() === 'KG'
}

export function quantityInputUnit(unit: string) {
  return usesGrams(unit) ? 'g' : unit
}

export function quantityInputValue(quantity: number, unit: string) {
  return String(usesGrams(unit) ? Math.round(quantity * 1000) : Math.round(quantity * 1000) / 1000)
}

export function quantityStep(unit: string) {
  return usesGrams(unit) ? 0.1 : 1
}

export function parseQuantityInput(value: string, unit: string):
  { ok: true; quantity: number } | { ok: false; error: string } {
  const text = value.trim()
  const grams = usesGrams(unit)
  const valid = grams ? /^\d+$/.test(text) : /^\d+(?:[.,]\d{1,3})?$/.test(text)
  if (!valid) return {
    ok: false,
    error: grams
      ? 'Ingresa el peso en gramos enteros. Por ejemplo: 250.'
      : 'Ingresa una cantidad positiva con hasta tres decimales.',
  }
  const input = Number(text.replace(',', '.'))
  const quantity = grams ? input / 1000 : input
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_PRODUCT_QUANTITY) {
    return { ok: false, error: 'Ingresa una cantidad válida mayor que cero y dentro del límite permitido.' }
  }
  return { ok: true, quantity }
}
