# API de logística

Base: `/api/logistica`. Todas las rutas requieren la autenticación existente del sistema.
Los cuerpos y respuestas usan camelCase; las tablas y columnas MySQL usan snake_case.

## Alcance

Gestión de tipos, categorías, unidades, productos, precios por sucursal, almacenes,
existencias y movimientos manuales. Una empresa puede tener varias sucursales y
cada sucursal varios almacenes.
La tabla `configuraciones_globales` identifica cada opción por `nombre` y
guarda su valor booleano en `activo`. La fila `STOCK_NEGATIVO` controla si
las salidas pueden dejar un saldo bajo cero. Comienza en `false`.

- Catálogos y productos: compartidos por la empresa.
- Precio de compra/venta y disponibilidad: `producto_sucursal`.
- Stock y stock mínimo: `inventarios`, por producto asignado y almacén.
- El stock total por sucursal es la suma de sus almacenes; no se duplica en productos.
- `codigoBarras` es opcional; se conserva como dato, sin búsqueda por escáner.
- Categorías admiten `color` hexadecimal (#RRGGBB) opcional.
- Tipos de movimiento son un catálogo interno sin endpoints de escritura.

## Permisos y sucursales

- GET: `LOGISTICA_VER`.
- POST, PATCH y DELETE: `LOGISTICA_GESTIONAR`.

La migración asigna ambos permisos al rol SUPERADMIN. Los demás roles se configuran
desde la administración de permisos existente. Los listados por sucursal solo incluyen
sucursales asignadas al usuario; solicitar una sucursal ajena devuelve 403.
Tener permisos de logística no concede acceso a todas las sucursales.

La base de datos impide asignar un inventario a un almacén de otra sucursal mediante
dos llaves foráneas compuestas. Para ello `inventarios.id_sucursal` se deriva en el
servidor; el cliente no lo envía.

## Endpoints

En los primeros seis recursos:
GET colección = listado paginado; GET /:id = detalle; POST = crear;
PATCH /:id = editar; DELETE /:id = eliminar únicamente si no tiene referencias.

| Recurso | Métodos |
|---|---|
| `tipos-producto` | GET, GET /:id, POST, PATCH /:id, DELETE /:id |
| `categorias` | GET, GET /:id, POST, PATCH /:id, DELETE /:id |
| `unidades-medida` | GET, GET /:id, POST, PATCH /:id, DELETE /:id |
| `productos` | GET, GET /:id, POST, PATCH /:id, DELETE /:id |
| `producto-sucursal` | GET, GET /:id, POST, PATCH /:id, DELETE /:id |
| `almacenes` | GET, GET /:id, POST, PATCH /:id, DELETE /:id |
| `inventarios` | GET, GET /:id, POST, PATCH /:id |
| `tipos-movimiento-inventario` | GET |
| `inventario-movimientos` | GET, GET /:id, POST |
| `configuraciones-globales` | GET, GET /:nombre, PATCH /:nombre |

Los inventarios y movimientos no tienen eliminación. Los movimientos tampoco se
editan: una corrección se registra como un nuevo ajuste con su observación.
Los catálogos, productos, asignaciones y almacenes con referencias se pueden
desactivar con `PATCH { "estado": false }`; el DELETE devuelve 409.

## Consultas

Listados paginados:
`?pagina=1&limite=50` (máximo 100 filas).
Respuesta: `{ "data": [...], "total": 15, "pagina": 1, "limite": 50 }`.

Filtros adicionales:

| Recurso | Filtros |
|---|---|
| Tipos, categorías y unidades | buscar, estado=true/false |
| Productos | buscar, estado, idCategoria, idTipoProducto |
| Producto-sucursal | buscar (nombre del producto), estado, idSucursal, idProducto |
| Almacenes | buscar, estado, idSucursal |
| Inventarios | buscar (nombre del producto), idSucursal, idAlmacen, idProducto |
| Movimientos | filtros de inventarios, idInventario, idTipoMovimiento, desde, hasta |

`desde` y `hasta` usan fecha/hora ISO con zona, por ejemplo
`2026-09-26T00:00:00-05:00`. El extremo final es inclusivo.
Los tipos de movimiento devuelven un arreglo directo, sin paginación.

## Stock negativo

`GET /api/logistica/configuraciones-globales` lista las opciones de la empresa.
`GET /api/logistica/configuraciones-globales/STOCK_NEGATIVO` obtiene esta
opción. Ambos requieren `LOGISTICA_VER`. La fila tiene este formato:

```json
{ "nombre": "STOCK_NEGATIVO", "activo": false }
```

`PATCH /api/logistica/configuraciones-globales/STOCK_NEGATIVO` requiere
`LOGISTICA_GESTIONAR` y el rol `SUPERADMIN`, porque afecta a todas las
sucursales. Acepta este cuerpo:

```json
{ "activo": true }
```

Con `true`, una salida puede registrar stock negativo en `inventarios.stock`
y en `inventario_movimientos.stock_resultante`. Con `false`, una salida que
dejaría saldo negativo devuelve 409 sin crear movimiento. Si la opción se apaga
cuando ya hay saldos negativos, estos se conservan en el historial y se pueden
recuperar con entradas. El mínimo configurado sigue siendo no negativo.

El cambio de configuración se coordina con cada movimiento mediante bloqueos
de base de datos para que una salida use un valor definido de la opción.

## Cuerpos de creación

### Tipo de producto
```json
{ "nombre": "Mercadería", "estado": true }
```

### Categoría
```json
{ "nombre": "Abarrotes", "color": "#F58220", "estado": true }
```

### Unidad de medida
```json
{ "nombre": "Kilogramo", "simbolo": "KG", "estado": true }
```

### Producto
```json
{
  "idTipoProducto": 1,
  "idCategoria": 1,
  "idUnidadMedida": 1,
  "nombre": "Arroz superior",
  "detalle": "Venta a granel",
  "codigoBarras": null,
  "imagen": null,
  "estado": true
}
```
Los IDs de ejemplo deben sustituirse por los obtenidos al crear los catálogos.
Tipo, categoría y unidad deben estar activos.
La unidad del producto no puede cambiar una vez asignado a una sucursal,
para conservar el significado de las cantidades históricas.

### Asignación de producto a sucursal
```json
{
  "idProducto": 1,
  "idSucursal": 1,
  "precioCompra": "3.20",
  "precioVenta": "4.50",
  "estado": true
}
```
Solo se permite una asignación por pareja producto/sucursal.
PATCH permite precioCompra, precioVenta y estado; los IDs de la relación son inmutables.

### Almacén
```json
{ "idSucursal": 1, "nombre": "Principal", "direccion": null, "estado": true }
```
Nombre único dentro de la sucursal. PATCH permite nombre, direccion y estado.

### Inventario
```json
{
  "idProductoSucursal": 1,
  "idAlmacen": 1,
  "stockMinimo": "5.000",
  "stockInicial": "50.000"
}
```
El stock inicial y el mínimo son opcionales, con valor cero.
Si stockInicial es mayor que cero, se registra su movimiento en la misma transacción.
Se permite un inventario por pareja producto-sucursal/almacén.
PATCH solo acepta `{ "stockMinimo": "10.000" }`.

### Movimiento
```json
{
  "idInventario": 1,
  "idTipoMovimiento": 3,
  "cantidad": "0.750",
  "observacion": "Ajuste por conteo físico"
}
```

Tipos precargados:

| ID | Nombre | Naturaleza |
|---|---|---|
| 1 | Stock inicial | ENTRADA |
| 2 | Ajuste de entrada | ENTRADA |
| 3 | Ajuste de salida | SALIDA |
| 4 | Merma | SALIDA |

La cantidad siempre es positiva: el tipo determina si suma o resta.
Stock inicial solo se acepta antes del primer movimiento, con saldo cero.
El servidor asigna el usuario y la fecha; no se pueden falsificar desde el cuerpo.
Se rechazan movimientos en sucursales, almacenes, asignaciones o productos inactivos.

## Decimales, integridad y errores

- Cantidades: DECIMAL(14,3). Precios: DECIMAL(14,2).
- Se aceptan números o cadenas decimales con punto. Se recomiendan cadenas.
- Prisma devuelve los decimales como cadenas JSON para conservar precisión.
- Cantidades enviadas y precios negativos, exceso de decimales y campos desconocidos: 400.
- Sin permiso o sucursal ajena: 403.
- ID inexistente: 404.
- Duplicados, referencias que impiden borrar, stock insuficiente con la opción
  desactivada o stock inicial repetido: 409.
- PATCH no aplica valores predeterminados a campos omitidos.
- El movimiento bloquea la fila de inventario con FOR UPDATE y calcula con Decimal.
- Stock e historial se guardan juntos: si falla cualquiera, se revierte la transacción.

## Base de datos y verificación

Migraciones: `20260926050000_logistica`,
`20260926060000_configuracion_stock_negativo` y
`20260926070000_configuraciones_por_nombre`. La última convierte el campo
específico anterior en `nombre` y `activo` sin perder el valor guardado.
El seed de logística es idempotente y no reinicia la configuración.

Desde backend:
```powershell
npx prisma generate
npx prisma migrate deploy
npm run build
npm test
```

Pruebas HTTP + MySQL optativas (requieren migración aplicada y un usuario existente):
```powershell
$env:LOGISTICA_DB_TESTS='1'
npm test
```

Estas pruebas simulan al usuario autenticado y usan HTTP, validaciones, permisos
y SQL reales. Crean datos identificados como TEST_LOG y eliminan únicamente sus
propios registros al finalizar. Cambian temporalmente la configuración global y
restauran su valor anterior. Incluyen concurrencia, rollback, stock negativo y
aislamiento entre sucursales.
