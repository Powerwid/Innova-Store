// La ventana se reserva durante el clic para que el navegador permita abrirla
// aunque registrar la venta tarde. El PDF se carga sólo después de confirmar.
export function reservarVentanaTicket(): Window | null {
  try {
    const ventana = window.open('', '_blank', 'width=450,height=650,scrollbars=yes,resizable=yes')
    if (!ventana) return null
    ventana.opener = null
    ventana.document.title = 'Ticket de venta · Innova Store'
    const mensaje = ventana.document.createElement('p')
    mensaje.textContent = 'Confirmando la venta y preparando el ticket…'
    mensaje.style.cssText = 'font:16px system-ui,sans-serif;padding:24px;text-align:center'
    ventana.document.body.append(mensaje)
    return ventana
  } catch {
    return null
  }
}

export function cargarTicketVenta(ventana: Window | null, idVenta: number): boolean {
  if (!ventana || ventana.closed) return false
  try {
    ventana.location.replace(`/api/ventas/${idVenta}/ticket-pdf`)
    return true
  } catch {
    return false
  }
}

export function abrirTicketVenta(idVenta: number): boolean {
  return cargarTicketVenta(reservarVentanaTicket(), idVenta)
}
