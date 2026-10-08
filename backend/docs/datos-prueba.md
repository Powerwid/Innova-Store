# Datos de prueba del minimarket

El catálogo de demostración contiene **68 productos**, **15 categorías**, **6 tipos de producto**, **8 unidades de medida usadas** y **2 almacenes**. Los registros se identifican con `DEMO LOG -` y se asignan a la sucursal activa del administrador configurado en `ADMIN_CORREO`.

Desde la raíz del proyecto:

```powershell
npm --prefix backend run seed:test
```

Requiere las tablas y el administrador del seed base. El comando se puede repetir: conserva los productos existentes, sus precios y existencias, y evita aplicar dos veces los ajustes de inventario. El almacén de demostración Mostrador se identifica como área de venta; Depósito conserva su función de almacén.

## Organización por tabla

`prisma/seeds/test.ts` solo coordina la ejecución en orden de dependencias. Las inserciones se encuentran en `prisma/seeds/test/`:

| Archivo | Contenido |
| --- | --- |
| `configuraciones-globales.seed.ts` | Configuración inicial si aún no existe. |
| `tipos-movimiento-inventario.seed.ts` | Tipos de movimiento para el kardex. |
| `tipos-producto.seed.ts` | Mercadería, fresco, refrigerado, congelado, hogar e higiene. |
| `categorias.seed.ts` | Verduras, frutas, frescos, lácteos, huevos, bebidas y otras categorías. |
| `unidades-medida.seed.ts` | Unidad, kg, litro, docena, paquete, caja, metro y par. |
| `almacenes.seed.ts` | Mostrador y Depósito. |
| `productos.seed.ts` | Datos editables de cada producto de prueba. |
| `producto-sucursal.seed.ts` | Asignaciones, precios y estado en la sucursal. |
| `inventarios.seed.ts` | Stock inicial, mínimo y distribución entre almacenes. |
| `inventario-movimientos.seed.ts` | Ajustes de entrada, salida y mermas. |

El contexto de usuario y sucursal está en `prisma/seeds/contexto-test.ts`. El stock y su movimiento inicial se crean juntos usando el servicio de logística para mantener consistente el kardex.

## Casos incluidos

- Productos de aspecto similar: tomate italiano/cherry, papa blanca/amarilla, manzana roja/verde y distintas presentaciones de leche y huevos.
- Venta por peso con cantidades fraccionarias, venta por unidad y presentaciones por caja o paquete.
- Stock normal, bajo mínimo y agotado.
- Producto descontinuado, producto sin asignación, asignación inactiva y precio de venta pendiente.
- Catálogo de más de 50 productos para comprobar la segunda página, búsquedas y filtros por tipo y categoría.

Los precios son ficticios. El seed no registra ventas, no abre cajas ni agrega fotos al reconocimiento; las referencias visuales se registran desde Productos → Fotos.

## Verificación

```powershell
npm --prefix backend run test:seed
```

Esta prueba crea una base MySQL temporal, aplica las migraciones, ejecuta el seed dos veces y comprueba relaciones, saldos, ausencia de duplicados y conservación de un precio editado. Al finalizar elimina únicamente la base temporal que creó. La conexión requiere permiso para crear esa base.

## Interfaz

La lista de productos tiene filtro por tipo y tarjetas para espacios reducidos. El POS móvil permite alternar entre Productos y Carrito mediante la barra inferior, con controles de cantidad de mayor tamaño. Los formularios y pagos se distribuyen en columnas según el espacio disponible. Estos patrones se adaptaron de Innova Restaurant a las rutas y reglas de Store.
