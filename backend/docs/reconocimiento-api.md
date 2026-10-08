# Reconocimiento visual de productos

El backend NestJS recibe fotos, valida acceso al catálogo y consulta un servicio interno Python con SigLIP2 y FAISS. Devuelve candidatos de la sucursal con sus precios y unidades actuales. No registra una compra o venta ni calcula cantidad o peso. Toda selección requiere confirmación.

## Activación local

El servicio Python está en `recognition-service/`, al mismo nivel que `backend/`. Sus dependencias se instalaron en `recognition-service/.venv` y los pesos del modelo fijo quedaron descargados en la caché local de Hugging Face durante la verificación. En otro equipo, sigue su [README](../../recognition-service/README.md).

1. Prepara las tablas y genera el cliente Prisma desde `backend/`:

   ```powershell
   npx prisma migrate status --config prisma7.config.ts
   npx prisma migrate deploy --config prisma7.config.ts
   npx prisma generate --config prisma7.config.ts
   ```

   `migrate deploy` aplica todas las migraciones pendientes del repositorio. En el entorno revisado estaba pendiente también `20260928090000_catalogos_permisos_operaciones`, anterior a la nueva `20261001000000_referencias_visuales`. La implementación y sus pruebas no modificaron la base principal.

2. En `backend/.env` solo configura la URL de la API Python:

   ```dotenv
   RECOGNITION_SERVICE_URL=http://127.0.0.1:8001
   ```

   Los ajustes internos del backend están en `src/modules/reconocimiento/reconocimiento.config.ts`: espera de 120 segundos, fotos en `storage/reconocimiento`, revisión de pendientes cada 5 segundos y similitud mínima provisional de `0.70`. No necesitan variables de entorno. El directorio Python, configurado en su propio `.env`, conserva SQLite y los vectores. Las rutas relativas se resuelven desde el directorio en que arranca cada proceso.

3. Arranca Python desde la raíz del proyecto (su `.env` es opcional):

   ```powershell
   npm run dev:model
   ```

4. Arranca NestJS desde `backend/`:

   ```powershell
   npm run start:dev
   ```

Si `RECOGNITION_SERVICE_URL` está vacío, el procesamiento automático queda desactivado. Las fotos se pueden registrar en MySQL y quedan pendientes para cuando se configure la conexión.

## Uso en el frontend

- **Logística → Productos → Fotos**: cargar o capturar fotos, revisar procesamiento, reintentar errores y retirar referencias. Las fotos de presentación del catálogo no se registran automáticamente como referencias.
- **POS → Reconocer por foto**: buscar candidatos de la sucursal, elegir uno e ingresar cantidad o peso. Requiere caja abierta, almacén válido y stock suficiente, salvo que el sistema permita stock negativo.
- **Compras → Nueva compra → Reconocer por foto**: agregar al detalle de compra el producto confirmado con su precio de compra. Permite seguir ajustando precio y cantidades antes de registrar la compra.

Las búsquedas se cancelan al cerrar la ventana. Cambiar de sucursal, carrito o almacén descarta la selección anterior. La cámara funciona en HTTPS o localhost y se libera al tomar la foto o cerrar la ventana. La coincidencia visual nunca agrega productos automáticamente ni mide el peso.

## Acceso

Todas las rutas NestJS están bajo `/api/reconocimiento` y utilizan la autenticación existente del sistema. La conexión entre NestJS y Python se realiza por HTTP usando únicamente la URL, sin credenciales adicionales.

Lectura y búsqueda requieren `LOGISTICA_VER`; registro, retiro y reindexación requieren `LOGISTICA_GESTIONAR`. Un usuario de sucursal solo administra referencias de productos asignados a alguna de sus sucursales. El superadministrador también puede registrar referencias para productos globales aún sin asignación. La búsqueda siempre exige una sucursal activa incluida en las sucursales del usuario.

## Rutas

| Método | Ruta relativa | Uso |
| --- | --- | --- |
| GET | `/estado` | Disponibilidad Python, estados de referencias visibles y umbral provisional. |
| POST | `/productos/:idProducto/referencias` | Registrar una foto real para un producto. Multipart: `file`. |
| GET | `/productos/:idProducto/referencias` | Listar referencias, con `pagina=1&limite=50`. |
| GET | `/referencias/:id/imagen` | Obtener la foto original con autenticación y sin caché pública. |
| POST | `/referencias/:id/reintentar` | Volver a poner una referencia activa en la cola. |
| DELETE | `/referencias/:id` | Retirar de búsquedas y programar eliminación en FAISS. |
| POST | `/productos/:idProducto/reindexar` | Reindexar las fotos activas de un producto. |
| POST | `/reindexar` | Reindexar todas las referencias activas de productos activos; solo SUPERADMIN. |
| POST | `/buscar` | Buscar candidatos. Multipart: `file`, `idSucursal`, `limite` opcional de 1 a 10. |

Los IDs son enteros positivos de hasta `2147483647`. Una foto admite JPEG, PNG o WebP y hasta 8 MiB. NestJS comprueba firma y MIME; Python decodifica la imagen, rechaza archivos corruptos/animados o con más de 16 millones de píxeles y corrige la orientación EXIF. Una foto que supera la validación de firma pero no la decodificación queda en `ERROR`, para revisión.

Ejemplos desde PowerShell usando un archivo de cookies obtenido al iniciar sesión en el sistema:

```powershell
curl.exe -b cookies.txt -X POST http://localhost:3000/api/reconocimiento/productos/31/referencias -F "file=@C:/fotos/papa-referencia.jpg"
curl.exe -b cookies.txt http://localhost:3000/api/reconocimiento/productos/31/referencias
curl.exe -b cookies.txt -X POST http://localhost:3000/api/reconocimiento/buscar -F "file=@C:/fotos/papa-consulta.jpg" -F "idSucursal=2" -F "limite=5"
```

Primero registra distintas fotos etiquetadas correctamente para los productos reales del catálogo. Espera a que su estado sea `DISPONIBLE` antes de buscar. Las imágenes comerciales de `Producto.imagen` se conservan y no se indexan automáticamente.

Ejemplo abreviado de respuesta de búsqueda:

```json
{
  "idSucursal": 2,
  "modeloVersion": "google/siglip2-base-patch16-224@75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2:rgb-exif-v1",
  "estado": "CANDIDATOS",
  "requiereConfirmacion": true,
  "similitudMinima": 0.7,
  "candidatos": [
    {
      "idProducto": 31,
      "idProductoSucursal": 44,
      "nombre": "Papa blanca",
      "precioCompra": "2.00",
      "precioVenta": "3.50",
      "unidadMedida": { "nombre": "Kilogramo", "simbolo": "kg" },
      "idReferencia": 12,
      "similitud": 0.83
    }
  ]
}
```

`similitud` es coseno, no probabilidad. El umbral inicial `0.70` es provisional y se debe ajustar con una evaluación del minimarket. `/estado` devuelve `umbralCalibrado:false`. Ningún resultado agrega productos automáticamente. Unidades, cantidades y peso corresponden a la operación comercial posterior.

Puede devolver `SIN_REFERENCIAS` o `SIN_COINCIDENCIAS`, con selección manual como alternativa. Si Python está caído o sin configurar, devuelve `503`; una versión incompatible o índice vacío con referencias previamente disponibles devuelve `409` y requiere reindexación.

## Persistencia y trabajos

`ReferenciaVisual` relaciona cada foto con `Producto` mediante una clave foránea. Guarda SHA-256, archivo, tipo, versión del encoder, dimensión, estado y recuperación de trabajos. La combinación producto/SHA-256 es única: subir otra vez la misma foto para ese producto reutiliza el ID. Registrar una foto retirada la reactiva.

Los estados son `PENDIENTE`, `PROCESANDO`, `DISPONIBLE`, `ERROR` y `RETIRADA`. El procesador reclama trabajos mediante una actualización condicional y un token de lease. Recupera trabajos interrumpidos cuando vence su lease; los errores temporales reintentan con espera creciente. Los errores de imagen y versión requieren revisión/reintento explícito. Las fotos retiradas se conservan como respaldo; dejan de ser elegibles inmediatamente, antes de su eliminación del índice remoto.

Python guarda originales y vectores normalizados en SQLite transaccional y reconstruye FAISS al iniciar. Antes de ordenar se filtran los IDs permitidos por NestJS; devuelve la mejor referencia por producto. NestJS vuelve a comprobar las referencias y consulta productos activos, asignación de sucursal, unidad y precios actuales.

Esta primera versión debe desplegarse con **una instancia del procesador NestJS** y **un proceso Python con `--workers 1`**. El lease protege las reclamaciones y las respuestas antiguas en MySQL; escalar mutaciones entre varios procesos Nest requeriría añadir una generación monotónica al contrato remoto para ordenar escrituras tardías. No compartas SQLite entre réplicas Python.

Conserva respaldos de MySQL, las fotos del backend y el almacenamiento Python. No guardes estos archivos en Git. Para cambiar encoder/revisión/preprocesamiento:

1. Conserva el almacenamiento Python actual y usa uno nuevo para la nueva versión.
2. Arranca Python con la nueva revisión exacta.
3. Solicita `POST /api/reconocimiento/reindexar` con un superadministrador.
4. Espera a `DISPONIBLE` y evalúa candidatos con fotos nuevas.

No se requiere reentrenar para añadir referencias/productos; sí se requiere reextraer todas las referencias cuando cambia la versión del encoder. La búsqueda de esta primera versión procesa un producto por foto, sin conteo de múltiples objetos ni reconocimiento de peso.

## Verificación

Desde `backend/`:

```powershell
npm run test
npm run build
```

Prueba completa opt-in, con MySQL temporal y el servicio Python real:

```powershell
npm run build
node scripts/test-reconocimiento-real.mjs C:/fotos/referencia.jpg
```

Si omites la foto, utiliza una imagen de muestra del proyecto para comprobar ejecución. El script necesita permisos para crear/eliminar una base temporal en MySQL, Python instalado en `recognition-service/.venv` y el modelo disponible o acceso a Hugging Face. Usa un puerto local libre y almacenamiento temporal; elimina sus propios recursos al terminar. Nunca aplica migraciones a la base principal.

Se verificaron migraciones desde cero, registro y deduplicación MySQL, indexación SigLIP2 real de 768 dimensiones, búsqueda FAISS, precio de sucursal y retiro del índice. Recuperar la misma foto con similitud cercana a 1 verifica funcionamiento, no precisión comercial. Las pruebas HTTP usan controlador, guards de permisos, Multer, validación y servicio reales con persistencia y transporte sustituidos; la autenticación JWT existente no se vuelve a implementar.

Las instrucciones y pruebas Python están en [recognition-service/README.md](../../recognition-service/README.md).
