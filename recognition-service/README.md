# Servicio interno de reconocimiento visual

FastAPI recibe fotografías desde NestJS, extrae embeddings con **SigLIP2** y busca referencias mediante **FAISS CPU**. NestJS conserva la autoridad sobre productos, sucursales, precios, permisos y operaciones comerciales. Este servicio no modifica el catálogo MySQL ni registra ventas o compras.

## Inicio local en Windows

Desde `recognition-service/`, con Python 3.12:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install "torch>=2.6.0,<3.0" --index-url https://download.pytorch.org/whl/cpu
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Arranca la API y configura su URL en el backend NestJS:

En este proyecto también puedes ejecutar `npm run dev:model` desde la raíz. Usa `.venv` y lee `.env` si existe; no es necesario crearlo para usar los valores predeterminados.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8001 --workers 1
```

El proceso carga el modelo al recibir la primera referencia o consulta con referencias disponibles. `/health` no descarga ni carga los pesos. El commit del modelo está fijado para que reinicios posteriores generen vectores compatibles:

```text
google/siglip2-base-patch16-224@75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2:rgb-exif-v1
```

El repositorio publica 375.187.970 parámetros F32: los pesos completos requieren aproximadamente **1,5 GB** de descarga y espacio en la caché de Hugging Face, además de dependencias y memoria del proceso. No incluye datasets ni entrenamiento. El primer uso necesita conexión a Hugging Face; una vez descargado puede funcionar desde la caché. Para usar GPU debes instalar una versión de PyTorch compatible y cambiar `RECOGNITION_DEVICE`; FAISS sigue utilizando CPU.

## Contrato HTTP

La API recibe conexiones HTTP desde NestJS sin credenciales adicionales. El navegador consulta las rutas autenticadas de NestJS.

| Método y ruta | Entrada | Resultado |
| --- | --- | --- |
| `GET /health` | Sin parámetros | `status`, `modelVersion`, `referenceCount`, `modelLoaded` |
| `PUT /references/{idReferencia}` | Multipart: `file`, `idProducto` entero positivo | `idReferencia`, `idProducto`, `modelVersion`, `dimension` |
| `DELETE /references/{idReferencia}` | ID positivo | `204`, incluso si ya se eliminó |
| `POST /search` | Multipart: `file`, `allowedReferenceIds` como arreglo JSON, `limit` opcional | `modelVersion`, `matches` |

`limit` acepta de 1 a 50 y vale 20 por defecto. Limita **productos distintos**: se devuelve la referencia de mayor similitud de cada producto. NestJS debe validar de nuevo las referencias, producto y sucursal antes de presentar candidatos. Los IDs deben estar dentro del rango entero seguro de JSON (`1..2^53-1`).

Ejemplo de respuesta de búsqueda:

```json
{
  "modelVersion": "google/siglip2-base-patch16-224@75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2:rgb-exif-v1",
  "matches": [
    { "idReferencia": 12, "idProducto": 31, "score": 0.83 }
  ]
}
```

El `score` es similitud coseno en `[-1,1]`, **no una probabilidad**. El servicio no impone un umbral universal de aceptación. La interfaz debe permitir confirmar o elegir manualmente; la precisión se mide con fotos del minimarket que no formen parte de las referencias.

Solo se aceptan fotos JPEG, PNG o WebP estáticas de hasta 8 MiB y 16 millones de píxeles. El contenido se valida con Pillow, se aplica orientación EXIF y se convierte a RGB. No se confía en el nombre del archivo ni en el MIME enviado. Solicitudes demasiado grandes devuelven `413`; fotos o campos inválidos `422`; fallo de encoder `503`.

## Persistencia y ampliación del catálogo

`RECOGNITION_STORAGE_DIR/references.sqlite3` almacena los metadatos, la imagen original y cada vector normalizado en una transacción. FAISS utiliza `IndexIDMap2(IndexFlatIP)` con IDs de referencia. Al reiniciar reconstruye exactamente el índice desde SQLite; no depende de un archivo FAISS que pueda quedar desactualizado respecto a los metadatos.

Registrar otra vez el mismo ID reemplaza su producto, foto y vector. Eliminarlo varias veces es seguro. Añadir productos consiste en registrar fotos etiquetadas a sus IDs, sin entrenar nuevamente el encoder.

La búsqueda crea un índice exacto de las referencias permitidas por NestJS antes de ordenar. Esto evita que referencias de otra sucursal o productos inactivos ocupen los primeros resultados. Para un catálogo pequeño o mediano permite resultados completos; si el catálogo crece mucho, mide memoria y latencia antes de cambiar a una estructura aproximada.

Un bloqueo de archivo impide arrancar dos escritores sobre el mismo almacenamiento. Ejecuta **un solo proceso y `--workers 1`**, sin replicas compartiendo este directorio. Las mutaciones están serializadas y el índice solo se intercambia cuando la transacción durable se completa.

Haz respaldos del directorio con el servicio detenido o utilizando el mecanismo de backup de SQLite; copia consistente de `references.sqlite3` junto con su WAL si está activo. Conserva también las fotos del backend para reconstruir el catálogo.

Si cambias el modelo, commit o preprocesamiento, el servicio rechaza un almacenamiento creado con otra versión. Para reindexar:

1. Conserva el almacenamiento anterior y sus fotos.
2. Configura un `RECOGNITION_STORAGE_DIR` nuevo y la revisión exacta del nuevo encoder.
3. Arranca el servicio y solicita la reindexación de las referencias desde el backend.
4. Verifica candidatos y latencia antes de sustituir el servicio anterior.

Nunca mezcles embeddings de diferentes versiones. El backend debe filtrar las referencias que ya no existen, quedaron pendientes o fallaron al indexarse.

## Pruebas

Las pruebas de infraestructura emplean FAISS real y un encoder determinista **solo inyectado desde tests**. La API de ejecución siempre utiliza SigLIP2, sin sustitutos o vectores aleatorios.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Incluyen reinicio y recuperación, reemplazo de referencia, eliminación idempotente, filtrado antes de ranking, productos distintos, rechazo de versiones y dimensiones incompatibles, validación de imágenes/EXIF/tamaños y conexiones HTTP desde otra máquina de la red.

Prueba opcional del encoder real y FAISS con una fotografía local:

```powershell
.\.venv\Scripts\python.exe scripts/smoke.py C:\fotos\papa.jpg
```

Registra y consulta la misma foto en un almacenamiento temporal, comprobando dimensión y similitud cercana a 1. Verifica ejecución del modelo y persistencia de búsqueda; no mide precisión frente a productos diferentes. La primera ejecución descarga los pesos completos.

## Docker

```powershell
docker build -t innova-recognition .
docker run --rm -p 127.0.0.1:8001:8001 --env-file .env -e RECOGNITION_STORAGE_DIR=/data -v innova-recognition-data:/data -v innova-hf-cache:/root/.cache/huggingface innova-recognition
```

El contenedor escucha internamente en `0.0.0.0`. Los volúmenes conservan SQLite y la caché de pesos.

## Verificación realizada

Se ejecutaron 19 pruebas de infraestructura con FAISS CPU real. Además se ejecutó `scripts/smoke.py` con SigLIP2 y PyTorch CPU sobre una imagen local del proyecto: produjo 768 dimensiones y recuperó la misma referencia con similitud 1,0. Los pesos quedaron en la caché local de Hugging Face. Esta comprobación valida la ejecución; la precisión para verduras, carnes y productos del minimarket necesita fotos reales etiquetadas y una evaluación aparte.

Documentación primaria: [SigLIP2 y extracción de embeddings](https://huggingface.co/google/siglip2-base-patch16-224), [métricas y normalización FAISS](https://github.com/facebookresearch/faiss/wiki/MetricType-and-distances), [índices FAISS](https://github.com/facebookresearch/faiss/wiki/Faiss-indexes), [archivos en FastAPI](https://fastapi.tiangolo.com/tutorial/request-files/).
