# Reportes del minimarket

El módulo **Reportes** usa la estructura de filtros, resultados y exportación de Innova Restaurant y las tablas operativas de Innova Store. Tiene submódulos independientes en el menú lateral. Los reportes de caja se encuentran en **Caja**:

| Reporte | Qué permite revisar | Permiso |
| --- | --- | --- |
| Ventas | Total vendido, cobro inicial, saldo originado y venta promedio | VENTAS_VER |
| Productos más vendidos | Cantidad por unidad de medida, número de ventas e importe por producto | VENTAS_VER |
| Compras por proveedor | Compras del periodo, pagos acumulados actuales y saldo por pagar | COMPRAS_VER |
| Flujo de caja | Cobros y pagos reales agrupados por día de Perú | CAJA_VER |
| Stock y reposición | Stock actual por área, agotados y cantidad hasta el mínimo configurado | LOGISTICA_VER |
| Cuentas por cobrar | Deuda original, abonos, saldo actual y vencimiento | DEUDAS_VER |

Cada submódulo tiene su propia ruta y permiso; el menú sólo muestra los disponibles para el usuario. **Reportes** agrupa ventas, productos, compras, stock y cuentas por cobrar. **Caja** contiene el historial, los reportes de cada apertura y el flujo de caja general. Cada consulta y exportación comprueba también las sucursales asignadas, incluso para SUPERADMIN. No agrega permisos, variables de entorno ni tablas nuevas.

## API

`GET /api/reportes/:tipo`, donde tipo es `ventas`, `productos`, `compras`, `caja`, `inventario` o `deudas`.

Parámetros:

- `idSucursal`: opcional; si no se envía incluye únicamente las sucursales del usuario.
- `desde` y `hasta`: fechas AAAA-MM-DD, obligatorias para los primeros cuatro reportes. El rango incluye ambos días de Perú y admite hasta 366 días.
- `buscar`: hasta 100 caracteres; cliente/venta/comentario en ventas, producto/categoría en productos y stock, proveedor en compras y cliente/documento en deudas. `%` y `_` se buscan como caracteres literales. Flujo de caja no admite búsqueda de texto.
- `estado`: `todos`; stock admite `critico` (stock <= mínimo) y `agotado` (stock <= 0). Deudas admite `pendiente` (cualquier saldo positivo), `vencida` y `pagada`.
- `pagina` y `limite`: paginación desde 1, máximo 100 registros por página.

Stock y cuentas por cobrar muestran el estado actual y no admiten fechas históricas. Una deuda vence cuando su fecha de pago es anterior al día actual de Perú y conserva saldo positivo. Una fecha de pago para hoy no está vencida.

La respuesta contiene columnas, filas, total de registros y métricas de **toda la consulta**, no únicamente de la página. Las lecturas de métricas y filas se realizan en una transacción RepeatableRead. Los valores monetarios se devuelven como decimales con dos cifras; las cantidades conservan tres. El ranking suma cantidades sólo dentro de un mismo producto y unidad.

## Exportaciones

`GET /api/reportes/:tipo/exportar/:formato`, donde formato es `ticket`, `excel` o `pdf` (A4), recibe los mismos filtros y permisos. Ignora la página y exporta todos los registros de la consulta, hasta 20 000. Si se supera ese límite, solicita reducir el periodo o agregar un filtro y no produce un archivo incompleto.

Excel incluye cabecera, filtros, métricas, columnas numéricas, autofiltro y encabezados inmovilizados. PDF usa A4 horizontal, repite el encabezado de la tabla y numera las páginas. Ticket genera un PDF de 80 mm con campos por registro y separadores punteados, como en Restaurant. Los tickets largos se dividen en páginas de 80 × 297 mm para evitar tamaños PDF incompatibles. Los tres incluyen sucursal, periodo o estado actual y fecha de generación. La descarga conserva los filtros de la consulta mostrada, aunque el usuario esté editando los campos para una consulta posterior.

### Reporte de una apertura de caja

Desde el icono de impresión en cada fila del historial de **Caja**, o desde su detalle, se puede elegir Ticket, Excel o PDF A4. El historial permite buscar por fecha de apertura con accesos Hoy, 7 días y Mes. Los filtros usan días completos de Perú.

`GET /api/cajas/:id/reporte` devuelve las secciones del reporte y `GET /api/cajas/:id/reporte/:formato` las exporta. Exige `CAJA_VER` y acceso a la sucursal. Incluye resumen, medios de pago, ventas, productos vendidos, otros ingresos, gastos y pagos de compras; el detalle comercial sólo aparece con `VENTAS_VER` o `COMPRAS_VER` respectivamente. Excel separa cada sección en una hoja; A4 y ticket las reúnen en un documento.

Los movimientos se seleccionan por `idCaja`, incluyendo pagos y percepciones de compras realizadas antes de la apertura. El egreso compensatorio del pago pendiente no se cuenta como salida de dinero. Saldo esperado = apertura + ventas cobradas + otros ingresos − gastos − pagos de compras y percepciones. Una caja abierta indica cierre pendiente; una cerrada muestra el monto contado y diferencia al cierre = contado − esperado. La lectura completa se realiza en una transacción RepeatableRead. Se rechazan cajas con más de 20 000 movimientos y líneas; no se recortan silenciosamente.

## Criterios de los importes

- Ventas usa el total comercial y los pagos registrados al vender. Los abonos posteriores no reescriben el cobro inicial. El nombre del cliente conserva el del ticket cuando existe una copia histórica.
- Productos usa cantidades y precios guardados en los detalles de venta. Los nombres, categorías y unidades provienen del catálogo actual. Un cambio de precio actual no modifica los importes vendidos.
- Compras usa la fecha de compra; el pagado actual suma sólo egresos del motivo Compra, incluso posteriores al periodo. Las percepciones no reducen la deuda principal del proveedor.
- Flujo de caja usa las fechas de ingreso y egreso. Incluye ventas cobradas, abonos y otros ingresos; egresos por compras y percepciones; y otros gastos. Excluye el egreso compensatorio del crédito y el fondo de apertura. Su neto es dinero recibido menos dinero entregado.
- Cuentas por cobrar resta los abonos del importe original de la deuda.
- Stock muestra inventarios de productos, asignaciones y áreas activas. La cantidad por reponer alcanza el mínimo configurado; no estima demanda futura.

El neto de caja y la diferencia entre ventas y compras no representan utilidad. Para un reporte de ganancias se necesita guardar el costo de la mercadería vendida y acordar el método de valorización. Los reportes de vencimientos de mercadería y mermas requieren registrar lotes, fechas de caducidad y motivos de pérdida.

## Verificación

`npm --prefix backend run test:realtime` prueba los seis endpoints y el reporte por caja en MySQL temporal, permisos, sucursales, periodo de Perú, resúmenes completos con paginación y exportaciones ticket/Excel/PDF A4. Las pruebas unitarias validan límites de fechas, medianoche de Perú y rechazo de consultas sin autorización antes de acceder a la base.
