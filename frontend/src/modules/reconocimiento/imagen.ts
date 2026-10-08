export const MAX_IMAGEN_BYTES = 8 * 1024 * 1024
export function validarImagen(file: File): string {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Usa una foto JPG, PNG o WebP.'
  if (!file.size) return 'La foto está vacía.'
  if (file.size > MAX_IMAGEN_BYTES) return 'La foto debe pesar como máximo 8 MB.'
  return ''
}

export function validarCantidad(value: string | number): string {
  const text = String(value).trim()
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(text)) return 'Ingresa una cantidad positiva con hasta tres decimales.'
  const number = Number(text.replace(',', '.'))
  if (!Number.isFinite(number) || number <= 0 || number > 99999999999.999) return 'Ingresa una cantidad válida mayor que cero.'
  return ''
}
