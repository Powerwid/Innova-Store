# API de caja, ventas, compras y deudas

Todas las rutas usan el prefijo global `/api`, requieren la autenticación JWT
existente y aplican control de permisos y de sucursales. Los cuerpos y respuestas
usan `camelCase`; Prisma mapea los datos a tablas y columnas MySQL en `snake_case`.

Este módulo registra movimientos financieros e inventario como hechos históricos.
Una operación confirmada no se edita ni se elimina: cualquier corrección debe
registrarse como una nueva operación compensatoria.

## Modelo de negocio

- Puede existir como máximo una caja abierta por sucursal.
- `caja_detalle` conserva el saldo actual de la caja separado por medio de pago.
- Un ingreso aumenta esos saldos y un egreso los disminuye. Ningún medio puede
  quedar con saldo negativo.
- `Fraccionado` es una opción comercial, no un medio de pago real. Nunca se acepta
  en `pagos`; deben enviarse los medios efectivamente usados.
- La opción reservada `Fraccionado` no puede renombrarse ni eliminarse desde el
  catálogo de medios de pago.
- Una venta crea un ingreso, sus líneas de producto y salidas de inventario.
- Si una venta queda parcial o totalmente a crédito, se registra además un egreso
  compensatorio sin salida real de caja y una deuda al cliente por la diferencia.
- Una compra crea sus líneas y entradas de inventario. Sus pagos pueden registrarse
  al crearla o posteriormente, mediante uno o varios egresos.
- La percepción de una compra no incrementa `compras.total`: es un egreso separado
  relacionado con la compra.
- El proveedor es global para toda la empresa. La compra conserva
  `nombreProveedor` como fotografía histórica aunque también guarde `idProveedor`.
- La deuda no duplica monto ni estado en columnas propias. Su capital es el egreso
  compensatorio del crédito y su saldo se obtiene restando los abonos registrados.

## Permisos y alcance por sucursal

| Área                              | Lectura       | Escritura           |
| --------------------------------- | ------------- | ------------------- |
| Caja, motivos, ingresos y egresos | `CAJA_VER`    | `CAJA_GESTIONAR`    |
| Ventas                            | `VENTAS_VER`  | `VENTAS_GESTIONAR`  |
| Compras y tipos de comprobante    | `COMPRAS_VER` | `COMPRAS_GESTIONAR` |
| Deudas y abonos                   | `DEUDAS_VER`  | `DEUDAS_GESTIONAR`  |

La migración asigna inicialmente estos permisos al rol `SUPERADMIN`. Para los
demás roles se administran con el módulo de permisos existente.

Los permisos no reemplazan el alcance por sucursal. El usuario solo puede consultar
o modificar operaciones de los IDs incluidos en `actor.sucursales`; solicitar una
sucursal ajena devuelve 403. La caja, el almacén, los productos asignados y la
sucursal de una misma operación deben coincidir.

## Endpoints

### Cajas

| Método | Ruta                              | Permiso          | Descripción                              |
| ------ | --------------------------------- | ---------------- | ---------------------------------------- |
| GET    | `/api/cajas`                      | `CAJA_VER`       | Lista cajas con paginación y filtros.    |
| GET    | `/api/cajas/abierta?idSucursal=1` | `CAJA_VER`       | Obtiene la caja abierta de una sucursal. |
| GET    | `/api/cajas/:id`                  | `CAJA_VER`       | Obtiene una caja y sus saldos por medio. |
| POST   | `/api/cajas`                      | `CAJA_GESTIONAR` | Abre una caja.                           |
| PATCH  | `/api/cajas/:id/cerrar`           | `CAJA_GESTIONAR` | Cierra una caja y calcula la diferencia. |

### Catálogos

| Método                            | Ruta                     | Permiso             |
| --------------------------------- | ------------------------ | ------------------- |
| GET, GET `/:id`                   | `/api/motivos-ingreso`   | `CAJA_VER`          |
| POST, PATCH `/:id`, DELETE `/:id` | `/api/motivos-ingreso`   | `CAJA_GESTIONAR`    |
| GET, GET `/:id`                   | `/api/motivos-egreso`    | `CAJA_VER`          |
| POST, PATCH `/:id`, DELETE `/:id` | `/api/motivos-egreso`    | `CAJA_GESTIONAR`    |
| GET, GET `/:id`                   | `/api/tipos-comprobante` | `COMPRAS_VER`       |
| POST, PATCH `/:id`, DELETE `/:id` | `/api/tipos-comprobante` | `COMPRAS_GESTIONAR` |

Los motivos permiten desactivación con `PATCH`; los tipos de comprobante no tienen
campo `activo`. Un catálogo referenciado por operaciones no se puede eliminar.
Los motivos reservados del sistema tampoco pueden desactivarse ni eliminarse.

### Movimientos y documentos

| Método | Ruta                              | Permiso             | Descripción                                          |
| ------ | --------------------------------- | ------------------- | ---------------------------------------------------- |
| GET    | `/api/ingresos`                   | `CAJA_VER`          | Lista todos los ingresos autorizados.                |
| GET    | `/api/ingresos/:id`               | `CAJA_VER`          | Detalle de un ingreso.                               |
| POST   | `/api/ingresos`                   | `CAJA_GESTIONAR`    | Crea un ingreso genérico.                            |
| GET    | `/api/egresos`                    | `CAJA_VER`          | Lista todos los egresos autorizados.                 |
| GET    | `/api/egresos/:id`                | `CAJA_VER`          | Detalle de un egreso.                                |
| POST   | `/api/egresos`                    | `CAJA_GESTIONAR`    | Crea un egreso genérico.                             |
| GET    | `/api/ventas`                     | `VENTAS_VER`        | Lista ventas.                                        |
| GET    | `/api/ventas/:id`                 | `VENTAS_VER`        | Detalle de una venta.                                |
| POST   | `/api/ventas`                     | `VENTAS_GESTIONAR`  | Registra una venta al contado o a crédito.           |
| GET    | `/api/compras`                    | `COMPRAS_VER`       | Lista compras con su estado de pago derivado.        |
| GET    | `/api/compras/:id`                | `COMPRAS_VER`       | Detalle de una compra.                               |
| POST   | `/api/compras`                    | `COMPRAS_GESTIONAR` | Registra compra, pago inicial y percepción opcional. |
| POST   | `/api/compras/:id/pagos`          | `COMPRAS_GESTIONAR` | Agrega un pago posterior a la compra.                |
| POST   | `/api/compras/:id/percepciones`   | `COMPRAS_GESTIONAR` | Registra una percepción posterior.                   |
| GET    | `/api/deudas-clientes`            | `DEUDAS_VER`        | Lista deudas con saldo y estado calculados.          |
| GET    | `/api/deudas-clientes/:id`        | `DEUDAS_VER`        | Detalle de deuda y abonos.                           |
| POST   | `/api/deudas-clientes/:id/abonos` | `DEUDAS_GESTIONAR`  | Registra un abono sin exceder el saldo.              |

Los movimientos, ventas, compras, percepciones, deudas y abonos no exponen rutas
`PATCH` ni `DELETE`.

## Consultas y paginación

Los listados aceptan `pagina` y `limite`; sus valores predeterminados son 1 y 50,
y el límite máximo es 100. La respuesta paginada tiene la forma:

```json
{
  "data": [],
  "total": 0,
  "pagina": 1,
  "limite": 50
}
```

| Recurso              | Filtros adicionales                                                   |
| -------------------- | --------------------------------------------------------------------- |
| Cajas                | `idSucursal`, `abierta=true                                           | false`, `desde`, `hasta` |
| Motivos              | `buscar`, `activo=true                                                | false`                   |
| Tipos de comprobante | `buscar`                                                              |
| Ingresos             | `idSucursal`, `idCaja`, `idMotivoIngreso`, `desde`, `hasta`, `buscar` |
| Egresos              | filtros de ingresos, `idMotivoEgreso`, `idCompra`                     |
| Ventas               | `idSucursal`, `desde`, `hasta`, `buscar`                              |
| Compras              | `idSucursal`, `idProveedor`, `idAlmacen`, `desde`, `hasta`, `buscar`  |
| Deudas               | `idSucursal`, `idCliente`, `estado`, `desde`, `hasta`, `buscar`       |

`desde` y `hasta` son fecha-hora ISO 8601 con zona, por ejemplo
`2026-09-28T00:00:00-05:00`; ambos extremos son inclusivos y `hasta` no puede ser
anterior a `desde`. Los estados de deuda admitidos son `PENDIENTE`, `PARCIAL`,
`PAGADA` y `VENCIDA`.

## Formato común de pagos

```json
{
  "pagos": [
    { "idMedioPago": 1, "monto": "70.00" },
    { "idMedioPago": 3, "monto": "30.00" }
  ]
}
```

- Cada monto es positivo y usa como máximo dos decimales.
- Un medio de pago puede aparecer una sola vez dentro de la misma operación.
- Se admiten hasta 20 medios por operación.
- Todos los IDs deben existir y `Fraccionado` se rechaza.
- Para ingresos y egresos genéricos, percepciones y abonos, la suma debe ser
  exactamente igual al monto del encabezado.
- En ventas y compras, `pagos` puede ser `[]` porque puede quedar saldo pendiente.

## Cuerpos y ejemplos

Los esquemas son estrictos: un campo no declarado produce 400. Los importes se
pueden enviar como número o cadena, pero se recomiendan cadenas para no perder
precisión en JavaScript.

### Abrir y cerrar caja

`POST /api/cajas`

```json
{
  "idSucursal": 1,
  "montoApertura": "250.00"
}
```

El `montoApertura` representa exclusivamente el efectivo físico disponible al
iniciar la caja. El backend lo asigna automáticamente al medio de pago Efectivo.
La sucursal debe estar activa y no
tener otra caja abierta.

`PATCH /api/cajas/12/cerrar`

```json
{ "montoCierre": "840.50" }
```

El cierre conserva el monto contado por el usuario. La respuesta incluye
`montoEsperado`, obtenido de los saldos por medio, y `diferencia`, calculada como
`montoCierre - montoEsperado`.

### Motivos y tipos de comprobante

```json
{ "motivo": "Aporte de capital", "activo": true }
```

En `PATCH`, ambos campos son opcionales pero debe enviarse al menos uno.

```json
{ "nombre": "Factura", "codigoSunat": "01" }
```

`codigoSunat` es opcional o `null`; cuando se informa debe tener exactamente dos
dígitos. En `PATCH` debe enviarse al menos `nombre` o `codigoSunat`.

Catálogos precargados y reservados:

| Catálogo          |  ID | Nombre            | Uso automático                       |
| ----------------- | --: | ----------------- | ------------------------------------ |
| Motivo de ingreso |   1 | Venta             | Venta                                |
| Motivo de ingreso |   2 | Abono de deuda    | Abono                                |
| Motivo de ingreso |   3 | Otro ingreso      | Disponible para movimientos manuales |
| Motivo de egreso  |   1 | Compra            | Pago de compra                       |
| Motivo de egreso  |   2 | Percepción        | Pago de percepción                   |
| Motivo de egreso  |   3 | Crédito a cliente | Contrapartida sin salida de caja     |
| Motivo de egreso  |   4 | Otro egreso       | Disponible para movimientos manuales |

Los IDs automáticos no se aceptan en los cuerpos específicos de venta, compra,
percepción o abono; el servidor los asigna para impedir clasificaciones falsas.
Los endpoints genéricos también deben rechazar esos motivos reservados: para un
movimiento manual se usa un motivo no reservado, como los IDs 3 y 4 precargados.

### Ingreso genérico

`POST /api/ingresos`

```json
{
  "idCaja": 12,
  "idSucursal": 1,
  "idMotivoIngreso": 3,
  "monto": "120.00",
  "detalle": "Aporte del propietario",
  "fechaIngreso": "2026-09-28T11:00:00-05:00",
  "pagos": [{ "idMedioPago": 1, "monto": "120.00" }]
}
```

`detalle` y `fechaIngreso` son opcionales. La caja debe estar abierta, pertenecer a
la sucursal y el motivo debe estar activo.

### Egreso genérico

`POST /api/egresos`

```json
{
  "idCaja": 12,
  "idSucursal": 1,
  "idMotivoEgreso": 4,
  "monto": "35.50",
  "detalle": "Movilidad local",
  "fechaEgreso": "2026-09-28T12:00:00-05:00",
  "pagos": [{ "idMedioPago": 1, "monto": "35.50" }]
}
```

Además de las validaciones del ingreso, cada medio debe tener saldo suficiente en
la caja. Si uno falla, todo el egreso se revierte.

### Venta

`POST /api/ventas`

```json
{
  "idCaja": 12,
  "idSucursal": 1,
  "monto": "100.00",
  "detalle": "Venta mostrador",
  "fechaIngreso": "2026-09-28T13:00:00-05:00",
  "productos": [
    {
      "idProductoSucursal": 25,
      "idAlmacen": 3,
      "cantidad": "2.000",
      "precioUnitario": "50.0000"
    }
  ],
  "pagos": [{ "idMedioPago": 1, "monto": "40.00" }],
  "credito": {
    "idCliente": 8,
    "fechaVencimiento": "2026-10-31"
  }
}
```

Reglas adicionales:

- La suma redondeada a dos decimales de `cantidad * precioUnitario` debe coincidir
  con `monto`.
- La suma de pagos no puede superar el total.
- Si los pagos no cubren el total, `credito` es obligatorio y el cliente debe estar
  activo. Si cubren todo, `credito` debe omitirse.
- No se puede repetir la pareja producto/almacén.
- Producto, asignación y almacén deben estar activos y pertenecer a la sucursal.
- Cada línea genera una salida de inventario tipo 6, `Venta`. Si
  `STOCK_NEGATIVO` está desactivado, el stock insuficiente devuelve 409.
- En el ejemplo se incrementa la caja en 40.00 y se crea una deuda por 60.00. El
  egreso compensatorio de 60.00 no tiene detalles de pago y no reduce caja.

### Compra

`POST /api/compras`

```json
{
  "idCaja": 12,
  "idSucursal": 1,
  "idAlmacen": 2,
  "idProveedor": 6,
  "nombreProveedor": "Distribuidora del Sur SAC",
  "fechaCompra": "2026-09-28T14:00:00-05:00",
  "subtotal": "84.75",
  "igv": "15.25",
  "total": "100.00",
  "detalles": [
    {
      "idProductoSucursal": 25,
      "cantidad": "2.000",
      "precioUnitario": "50.0000"
    }
  ],
  "comprobante": {
    "idTipoComprobante": 1,
    "serie": "F001",
    "numero": "1234",
    "fechaEmision": "2026-09-28"
  },
  "pagos": [{ "idMedioPago": 1, "monto": "40.00" }],
  "percepcion": {
    "fechaPercepcion": "2026-09-28",
    "baseCalculo": "100.00",
    "porcentaje": "2.000",
    "monto": "2.00",
    "numeroConstancia": "P-123",
    "pagos": [{ "idMedioPago": 1, "monto": "2.00" }]
  }
}
```

Reglas adicionales:

- `nombreProveedor` siempre es obligatorio. `idProveedor` es opcional y permite
  relacionar la fotografía histórica con el proveedor global.
- `subtotal` e `igv` se envían ambos o ninguno; si se informan, su suma debe ser
  igual a `total`.
- La suma redondeada de las líneas debe ser igual a `total`.
- No se puede repetir un producto y todas las líneas tienen un único almacén destino.
- Cada línea genera una entrada de inventario tipo 5, `Compra`, y actualiza el
  precio de compra de la asignación producto/sucursal.
- `pagos` puede estar vacío, pero la caja indicada debe estar abierta. Los pagos
  iniciales y posteriores acumulados nunca pueden exceder `total`.
- La percepción es opcional y se paga por separado. Su monto debe corresponder a
  `baseCalculo * porcentaje / 100`, redondeado a dos decimales.
- La respuesta de compra expone `montoPagado` y `saldoPendiente` derivados de los
  egresos con motivo `Compra`; los egresos por percepción no reducen ese saldo.

Pago posterior, `POST /api/compras/20/pagos`:

```json
{
  "idCaja": 12,
  "idSucursal": 1,
  "monto": "60.00",
  "detalle": "Cancelación de saldo",
  "fechaEgreso": "2026-09-29T09:00:00-05:00",
  "pagos": [
    { "idMedioPago": 1, "monto": "30.00" },
    { "idMedioPago": 3, "monto": "30.00" }
  ]
}
```

`monto` es opcional; si se omite, el servidor usa la suma de `pagos`. Si se envía,
debe coincidir exactamente con esa suma.

Percepción posterior, `POST /api/compras/20/percepciones`:

```json
{
  "idCaja": 12,
  "idSucursal": 1,
  "fechaPercepcion": "2026-09-29",
  "baseCalculo": "100.00",
  "porcentaje": "2.000",
  "monto": "2.00",
  "numeroConstancia": "P-124",
  "pagos": [{ "idMedioPago": 1, "monto": "2.00" }]
}
```

### Abono de deuda

`POST /api/deudas-clientes/9/abonos`

```json
{
  "idCaja": 12,
  "idSucursal": 1,
  "monto": "25.00",
  "detalle": "Primer abono",
  "fechaIngreso": "2026-09-30T10:00:00-05:00",
  "pagos": [{ "idMedioPago": 1, "monto": "25.00" }]
}
```

El abono crea un ingreso con motivo 2 y aumenta la caja. No puede superar el saldo
pendiente. El estado derivado se interpreta así:

- `PENDIENTE`: conserva todo el capital y no está vencida.
- `PARCIAL`: tiene abonos, saldo positivo y no está vencida.
- `PAGADA`: saldo igual a cero.
- `VENCIDA`: saldo positivo y fecha de vencimiento anterior a la fecha actual;
  este estado prevalece sobre pendiente o parcial.

## Decimales, fechas y tamaños

| Dato                                           | Precisión o formato                             |
| ---------------------------------------------- | ----------------------------------------------- |
| Dinero                                         | `DECIMAL(14,2)`, hasta 12 enteros y 2 decimales |
| Precio unitario                                | `DECIMAL(14,4)`, hasta 10 enteros y 4 decimales |
| Cantidad                                       | `DECIMAL(14,3)`, hasta 11 enteros y 3 decimales |
| Porcentaje                                     | `DECIMAL(6,3)`, mayor que 0 y máximo 100        |
| Fecha de comprobante, percepción o vencimiento | `YYYY-MM-DD` válida                             |
| Fecha-hora de operación                        | ISO 8601 con zona horaria                       |
| Detalle                                        | máximo 500 caracteres                           |

Los montos, precios y cantidades no admiten signo ni separador de miles. Los montos
operativos son positivos; apertura, cierre, subtotal e IGV pueden ser cero. Prisma
serializa decimales preservando su precisión.

## Integridad y concurrencia

- Caja, pagos, inventario y documentos de una operación se escriben en una única
  transacción. Si falla cualquier parte, no queda un registro parcial.
- Las filas de caja e inventario se bloquean antes de cambiar saldos para impedir
  que operaciones concurrentes consuman el mismo dinero o stock.
- La apertura bloquea la sucursal para asegurar una sola caja abierta incluso ante
  solicitudes simultáneas.
- Las llaves foráneas compuestas garantizan que caja, compra, almacén y sucursal
  mantengan la misma pertenencia donde el esquema lo permite; el servicio valida
  las relaciones restantes antes de escribir.
- Los tipos 5 `Compra` y 6 `Venta` del inventario son internos: solo los procesos
  de compra y venta deben generarlos, enlazados respectivamente con
  `idCompraDetalle` o `idIngresoProducto`.

## Errores

| Código | Situación habitual                                                                                                                    |
| -----: | ------------------------------------------------------------------------------------------------------------------------------------- |
|    400 | Cuerpo o consulta inválidos, sumas inconsistentes, fechas/formato incorrectos, entidad inactiva o medio `Fraccionado`.                |
|    401 | No autenticado o sesión inválida.                                                                                                     |
|    403 | Falta de permiso o sucursal fuera del alcance del usuario.                                                                            |
|    404 | Recurso, caja abierta, catálogo o relación inexistente.                                                                               |
|    409 | Duplicado, caja ya abierta/cerrada, saldo de caja o stock insuficiente, pago excesivo, deuda pagada o referencia que impide eliminar. |

Una validación de DTO devuelve los errores por ruta de campo:

```json
{
  "statusCode": 400,
  "message": "Errores de validación",
  "fieldErrors": {
    "pagos": "La suma de los pagos debe coincidir con el monto del ingreso"
  }
}
```

Un conflicto de concurrencia serializable devuelve 409 con el mensaje
`Los saldos cambiaron durante la operación; vuelve a intentarlo`.

## Tablas y catálogos internos

Las operaciones usan `cajas`, `caja_detalle`, `motivo_ingreso`, `motivo_egreso`,
`ingresos`, `egresos`, `ingresos_detalle_pago`, `egresos_detalle_pago`, `compras`,
`compras_detalle`, `tipos_comprobante`, `comprobantes`, `compras_percepciones`,
`ingresos_productos`, `deudas_clientes` y `abonos_deuda_cliente`.

Las migraciones relevantes son
`20260928064529_compras_cajas_ingresos_egresos` y
`20260928090000_catalogos_permisos_operaciones`. La segunda fija los IDs de los
motivos y tipos de movimiento que usa la lógica automática.
