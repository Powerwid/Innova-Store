export interface DetalleImporteCompra {
  cantidad: string
  precioUnitario: string
}

export function normalizarDetalleCompra(detalle: DetalleImporteCompra) {
  return {
    cantidad: Number(detalle.cantidad).toFixed(3),
    precioUnitario: Number(detalle.precioUnitario).toFixed(4),
  }
}

function escalado(valor: string, decimales: number): bigint {
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${decimales}})?$`).test(valor)) return 0n
  const [entero, fraccion = ''] = valor.split('.')
  return BigInt(entero!) * 10n ** BigInt(decimales) + BigInt(fraccion.padEnd(decimales, '0'))
}

// Cantidad (3 decimales) × precio (4). Redondear la suma al centavo,
// como hace el backend, en lugar de comparar el pago con fracciones de centavo.
export function totalCompraCentavos(detalles: readonly DetalleImporteCompra[]): bigint {
  const suma = detalles.reduce((total, detalle) => {
    const normalizado = normalizarDetalleCompra(detalle)
    return total + escalado(normalizado.cantidad, 3) * escalado(normalizado.precioUnitario, 4)
  }, 0n)
  return (suma + 50_000n) / 100_000n
}

export function pagoValido(monto: string): boolean {
  return /^\d{1,12}(?:\.\d{1,2})?$/.test(String(monto).trim()) && escalado(String(monto).trim(), 2) > 0n
}

export function totalPagosCentavos(pagos: readonly { monto: string }[]): bigint {
  return pagos.reduce((total, pago) => total + escalado(String(pago.monto).trim(), 2), 0n)
}
