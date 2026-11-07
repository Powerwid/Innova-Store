# Operaciones

`operaciones.module.ts` registra los controladores y servicios de las siguientes áreas:

- `cajas/`: apertura, cierre, saldos, ingresos, egresos, resumen y reportes de caja.
- `ventas/`: registro y consulta de ventas, copia histórica del ticket y PDF.
- `compras/`: compras, pagos posteriores y percepciones.
- `cuentas-por-cobrar/`: deudas de clientes y abonos.
- `catalogos/`: motivos de ingreso, motivos de egreso y tipos de comprobante.
- `compartido/`: acceso a sucursales, movimientos de inventario, consultas relacionadas, constantes y validaciones comunes.

Cada área conserva sus controladores, servicios, tipos, DTO y pruebas junto al código correspondiente.

## Transacciones

El servicio que ejecuta el caso de uso abre la transacción de Prisma y pasa el mismo cliente a los colaboradores. Los métodos `crearIngresoTx`, `crearEgresoTx` y `crearPercepcionTx`, así como los movimientos de caja e inventario, usan ese cliente sin abrir otra transacción.

Así, una venta o compra confirma todos sus efectos juntos o los revierte si falla alguno. Las consultas realizadas dentro del caso de uso también reciben ese cliente.

## Verificación

Desde `backend/`:

- `npm run build`
- `npm run lint`
- `npm test`: pruebas unitarias y de integración sin base de datos.
- `npm run test:operaciones`: flujo completo en una base MySQL temporal, usando la conexión configurada en `.env`.

Las pruebas de importes y pagos de la interfaz están en `frontend/scripts/` y se ejecutan desde `frontend/` con `npm run test:operaciones`. La compatibilidad entre los importes de la interfaz y la validación del servidor se comprueba en `backend/test/integration/compra-importes.spec.ts`.
