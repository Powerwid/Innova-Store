# Actualizaciones con Socket.IO

El servidor Nest comparte puerto con la API. El cliente conecta al namespace
`/tiempo-real` mediante el path `/socket.io`, indicando `auth.idSucursal` y enviando
las cookies HttpOnly de la sesión existente. No necesita otro token ni secreto.

El servidor verifica la firma de la sesión, el estado del usuario, la sucursal
asignada y sus permisos. Cada conexión entra en salas por sucursal y recurso.
También revalida permisos, estado y vencimiento en conexiones abiertas.

Después de confirmar una escritura, el evento `datos:actualizados` informa
`{ idSucursal, recursos }`. No transporta filas ni datos de clientes. Las pantallas
autorizadas consultan nuevamente la API para obtener los datos actualizados.
Una operación fallida o revertida no genera eventos; si falla la notificación,
la operación ya confirmada sigue siendo exitosa.

Los recursos son `caja`, `ventas`, `ingresos`, `egresos`, `compras`, `deudas`,
`stock` y `clientes`. Los cambios en catálogos compartidos refrescan las sucursales
conectadas. El cliente mantiene una conexión para la sucursal elegida, agrupa
ráfagas de eventos y recupera datos al reconectar. El refresco conserva el carrito
y los formularios abiertos.

## Ejecución

Usa `npm run dev` desde la raíz. El proxy de Vite incluye `/api` y `/socket.io`,
con soporte de WebSocket. Reinicia Vite si estaba abierto antes de añadir el
proxy. En producción, `npm run build` y `npm start` sirven interfaz, API y socket
desde la misma URL. Un proxy externo debe reenviar `/socket.io` a Nest y admitir
el cambio de protocolo WebSocket.

La implementación usa una instancia de Nest. Para distribuir conexiones entre
varias instancias se necesita un adaptador compartido de Socket.IO y configurar
el balanceador; esa distribución no está implementada aquí.

## Verificación

`npm --prefix backend run test:realtime` crea una base MySQL temporal, aplica las
migraciones y prueba clientes Socket.IO reales: cookies, permisos, aislamiento
entre sucursales, actualización de stock, reintentos de ventas sin duplicados,
rollback sin evento, clientes genéricos/identificados y cierre de caja. Al
terminar elimina únicamente esa base temporal.
