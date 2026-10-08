# Innova Store

El frontend es Vue con Vite y el backend es NestJS. La API vive bajo `/api`.

## Desarrollo

1. Instale las dependencias en `frontend` y `backend` con `npm install`.
2. Configure `backend/.env` a partir de `backend/.env.example`.
3. Ejecute `npm run dev` desde la raíz.

Vite abre `http://localhost:5173` y reenvía las solicitudes `/api` a Nest en `http://localhost:3000`. Use siempre rutas relativas `/api/...` desde Vue; así el navegador maneja las cookies bajo el mismo origen visible.

## Producción

Ejecute `npm run build` desde la raíz y luego `npm start`. El build de Vite coloca los archivos en `backend/public`; Nest sirve esos archivos y la API desde la misma URL. El comando de arranque usa `NODE_ENV=production`, por lo que las cookies `Secure` requieren HTTPS. `backend/public` es un artefacto de compilación y no se guarda en Git.

La configuración de autenticación y las rutas disponibles están en [backend/ACCESO.md](backend/ACCESO.md).

## Datos de prueba y pantallas responsivas

Ejecuta `npm --prefix backend run seed:test` para preparar 68 productos de distintos tipos, categorías, precios e inventarios. Las inserciones están separadas por tabla en `backend/prisma/seeds/test/`. Consulta la [guía de datos de prueba](backend/docs/datos-prueba.md) para ampliar el catálogo y verificar que el seed se pueda repetir.

En celular, Productos usa tarjetas con acciones; el POS permite alternar entre catálogo y carrito con una barra inferior. Los filtros, formularios y pagos se adaptan al ancho disponible.

## Reconocimiento visual

El backend incorpora referencias de productos en MySQL y consulta un servicio Python con SigLIP2 y FAISS. La configuración, rutas y pruebas están en [backend/docs/reconocimiento-api.md](backend/docs/reconocimiento-api.md). El servicio está en [recognition-service](recognition-service/README.md).

Después de aplicar las migraciones y configurar `RECOGNITION_SERVICE_URL=http://127.0.0.1:8001` en `backend/.env`, ejecuta desde la raíz en dos terminales:

```powershell
npm run dev:model
npm run dev
```

`dev:model` usa el entorno Python de `recognition-service/.venv`. Su `.env` es opcional; los valores predeterminados ya seleccionan SigLIP2 y CPU. El modelo se carga al procesar la primera foto y permanece en memoria mientras Python esté abierto.

En **Logística → Productos → Fotos** registra referencias de cada producto y espera el estado **Disponible**. En **POS → Reconocer por foto** o **Compras → Nueva compra → Reconocer por foto**, sube una foto o usa la cámara, selecciona un candidato e ingresa cantidad o peso antes de confirmar. La búsqueda usa los productos y precios de la sucursal elegida. Agregar una selección al carrito o al detalle de compra no registra automáticamente la operación. La cámara requiere HTTPS o localhost y permiso del navegador.

## Caja y operaciones

El detalle de caja consulta un resumen completo calculado por el backend, con cobros de ventas, otros ingresos, gastos y pagos de compras separados. El POS registra ventas reales y actualiza caja e inventario en una transacción, con protección contra reintentos del mismo carrito. Consulta la [API de operaciones](backend/docs/operaciones-api.md) y ejecuta `npm --prefix backend run test:operaciones` para verificar el flujo en una base temporal.