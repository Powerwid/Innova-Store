# Innova Store

El frontend es Vue con Vite y el backend es NestJS. La API vive bajo `/api`.

## Desarrollo

1. Instale las dependencias en `frontend` y `backend` con `npm install`.
2. Configure `backend/.env` a partir de `backend/.env.example`.
3. Ejecute `npm run dev` desde la raíz.

Vite abre `http://localhost:5173` y reenvía las solicitudes `/api` y Socket.IO (`/socket.io`) a Nest en `http://localhost:3000`. Use siempre rutas relativas desde Vue; así el navegador maneja las cookies bajo el mismo origen visible. Después de actualizar la configuración del proxy, reinicie `npm run dev`.

## Producción

Ejecute `npm run build` desde la raíz y luego `npm start`. El build de Vite coloca los archivos en `backend/public`; Nest sirve esos archivos y la API desde la misma URL. El comando de arranque usa `NODE_ENV=production`, por lo que las cookies `Secure` requieren HTTPS. `backend/public` es un artefacto de compilación y no se guarda en Git.

La configuración de autenticación y las rutas disponibles están en [backend/ACCESO.md](backend/ACCESO.md).

## Datos de prueba y pantallas responsivas

Ejecuta `npm --prefix backend run seed:test` para preparar 68 productos con nombres comerciales y stock mayor a 40 en 60 de los 64 productos vendibles. Las inserciones están separadas por tabla en `backend/prisma/seeds/test/`. Consulta la [guía de datos de prueba](backend/docs/datos-prueba.md) para ampliar el catálogo y verificar que el seed se pueda repetir.

En celular, el POS sigue la distribución de Innova Restaurant: muestra los productos escogidos en tarjetas y mantiene el resumen con Pagar abajo. El botón flotante abre el catálogo en un panel inferior; Ver venta regresa a los productos escogidos. En escritorio, la orden y el catálogo se muestran juntos.

Los productos cuya unidad es **KG** se agregan indicando el peso en **gramos**, por ejemplo `250`. El carrito muestra y permite editar gramos; sus botones suman o restan 100 g. El precio sigue siendo por kg y la API, el inventario y los carritos guardados conservan kg: 250 g se registran como 0.250 kg. La selección por reconocimiento también permite ingresar gramos. Los productos por unidad y otras medidas conservan su unidad; por ejemplo, cuerda por metro permite `1,5` M. Si un pollo entero tiene precio fijo por pieza, debe ser un producto por UND; si se cobra según la balanza, se mantiene por KG.

## Reconocimiento visual

La foto que se muestra en el catálogo y el POS se carga desde el icono de imagen de **Logística → Productos** o el botón **Foto producto** en celular. Se abre una ventana dedicada exclusivamente a la foto: permite verla, subir un archivo, usar la cámara o quitarla, sin mostrar ni actualizar los demás datos del producto. También se puede elegir la imagen al crear o editar el producto. Esta imagen comercial se conserva en `backend/storage/productos/` y en `Producto.imagen`; no se añade al reconocimiento. Las fotos para el modelo se administran desde la acción separada **Reconocimiento**.

El backend incorpora referencias de productos en MySQL y consulta un servicio Python con SigLIP2 y FAISS. La configuración, rutas y pruebas están en [backend/docs/reconocimiento-api.md](backend/docs/reconocimiento-api.md). El servicio está en [recognition-service](recognition-service/README.md).

Después de aplicar las migraciones y configurar `RECOGNITION_SERVICE_URL=http://127.0.0.1:8001` en `backend/.env`, ejecuta desde la raíz en dos terminales:

```powershell
npm run dev:model
npm run dev
```

`dev:model` usa el entorno Python de `recognition-service/.venv`. Su `.env` es opcional; los valores predeterminados ya seleccionan SigLIP2 y CPU. El modelo se carga al procesar la primera foto y permanece en memoria mientras Python esté abierto.

En **Logística → Productos → Fotos** registra referencias de cada producto y espera el estado **Disponible**. En **POS → Reconocer por foto** o **Compras → Nueva compra → Reconocer por foto**, sube una foto o usa la cámara, selecciona un candidato e ingresa cantidad o peso antes de confirmar. La búsqueda usa los productos y precios de la sucursal elegida. Agregar una selección al carrito o al detalle de compra no registra automáticamente la operación.

La cámara en vivo dentro de la página requiere HTTPS o localhost y permiso del navegador. Al entrar desde el celular por una IP con HTTP, **Usar cámara** abre el selector de captura del teléfono y solicita la cámara trasera mediante `capture="environment"`. Según el navegador, puede abrir la cámara o mostrar un selector de archivos. **Subir foto del producto** permite elegir una imagen guardada. Ambos caminos usan la misma vista previa y validación JPG, PNG o WebP de hasta 8 MB; cancelar la captura conserva la foto anterior.

## Caja y operaciones

El detalle de caja consulta un resumen completo calculado por el backend, con cobros de ventas, otros ingresos, gastos y pagos de compras separados. El POS registra ventas reales y actualiza caja e inventario en una transacción, con protección contra reintentos del mismo carrito. Consulta la [API de operaciones](backend/docs/operaciones-api.md) y ejecuta `npm --prefix backend run test:operaciones` para verificar el flujo en una base temporal.

Los carritos del POS se conservan en el navegador. Si su almacén desaparece tras resetear la base, el catálogo vuelve a consultar el área de venta vigente. Las líneas antiguas se mantienen para revisarlas, pero no se cobran si su producto, almacén o precio ya no corresponde al catálogo; retíralas o descarta ese carrito. Ejecuta `npm --prefix frontend run test:pos` para verificar la recuperación de sesiones y el stock por almacén.

El cobro separa cliente y método de pago. Aplica las migraciones con `npx prisma migrate deploy --config prisma7.config.ts` desde `backend` y ejecuta `npm run seed:clientes` para crear **Clientes varios**, usado en ventas sin identificación. Para **Pago pendiente**, se requiere un cliente identificado. La selección de comprobante muestra Documento interno; la emisión fiscal y sus series quedan pendientes.

Al confirmar una venta se abre su ticket PDF en una ventana, con el formato de 80 mm de Innova Restaurant. El visor permite imprimir o descargar; **Ventas → Ver ticket** permite reimprimir sin registrar otra venta. Si el navegador bloquea la ventana, el aviso de confirmación ofrece **Ver ticket**. Los datos del ticket se guardan con la venta para conservar precios, cliente, IGV y vuelto originales. Requiere la migración `20261008010000_tickets_venta`.

Caja, su detalle, ventas, ingresos, egresos, compras, deudas y stock se actualizan mediante Socket.IO, usando la sesión existente y los permisos de cada sucursal. No requiere variables de entorno adicionales. Ejecuta `npm --prefix backend run test:realtime` para comprobar conexiones, aislamiento y operaciones reales en una base temporal. Consulta la [guía de tiempo real](backend/docs/realtime.md).

## Reportes

El módulo **Reportes** tiene submódulos de ventas, productos más vendidos, compras por proveedor, stock para reposición y cuentas por cobrar. **Caja** ofrece flujo de caja y reportes de cada apertura desde su historial. Incluye filtros, paginación y exportación completa en ticket de 80 mm, Excel y PDF A4. Mantiene los permisos existentes y recibe actualizaciones mediante Socket.IO. Consulta los criterios de cálculo en la [guía de reportes](backend/docs/reportes.md).
