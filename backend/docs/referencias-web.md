# Referencias visuales de Internet

El conjunto local `output/referencias-web/` reúne las fotos solicitadas para los productos del catálogo. Cada producto tiene un manifiesto en `productos/ID.json`, con la imagen original, SHA-256, página de origen, URL de la foto, búsqueda y revisión visual. Las imágenes descartadas conservan su motivo en el manifiesto. Los archivos del conjunto y los almacenamientos de ejecución no se incluyen en Git.

Las referencias se relacionan con el ID del producto en MySQL y se indexan con el encoder SigLIP2 existente y FAISS. Esta carga amplía las referencias; no modifica los pesos del modelo. Los productos sin marca definida utilizan imágenes de distintas marcas de la misma familia y presentación. La precisión se debe medir con fotos nuevas tomadas en el minimarket.

## Preparar y revisar

Desde la raíz, con candidatos de búsquedas guardados en `candidatos/*.json`:

```powershell
recognition-service/.venv/Scripts/python.exe recognition-service/scripts/prepare_web_references.py output/referencias-web
recognition-service/.venv/Scripts/python.exe recognition-service/scripts/review_web_references.py output/referencias-web --pending
```

El descargador conserva los originales, valida formato y resolución, y descarta duplicados. Las hojas de contacto en `revision/` sirven para inspeccionar candidatos; sus miniaturas no se registran como referencias. Antes de importar, revisa cada foto y marca `reviewStatus: "approved"` solamente en las imágenes correctas. Retira del arreglo `images` las descartadas y conserva su procedencia y motivo en `excludedImages` y `rejected`. No completes cantidades con copias o versiones recortadas de una misma foto.

## Importar e indexar

Desde `backend/`, con la base actual y el servicio Python iniciado:

```powershell
npm run referencias:importar -- ../output/referencias-web --dry-run
npm run referencias:importar -- ../output/referencias-web --indexar
```

Se puede limitar una carga con `--ids=1,2,3`. La validación comprueba diez fotos aprobadas por producto, identidad y fecha de creación del producto, rutas dentro del conjunto, integridad SHA-256 y formato. Un conjunto de otra base o anterior a un reset necesita revisar de nuevo las asociaciones.

El registro usa el servicio del backend y reutiliza referencias del mismo producto y SHA. Conserva las fotos anteriores. También asigna la primera foto como imagen del catálogo cuando el producto no tenía una. No altera nombres, precios, stock ni asignaciones de sucursal. La carga local permite registrar referencias del producto inactivo con un superadministrador, conservando su estado; las búsquedas comerciales siguen filtrando productos activos y la sucursal.

`--indexar` procesa la cola y comprueba que las referencias importadas terminen disponibles. Solo necesita la conexión existente `RECOGNITION_SERVICE_URL`. El archivo `importacion.json` y los manifiestos guardan los IDs registrados. En la web se consultan en **Logística → Productos → Fotos**.

Conserva un respaldo del conjunto con sus fuentes, MySQL, `backend/storage/reconocimiento/` y el almacenamiento SQLite del servicio Python. Para añadir productos nuevos, prepara y revisa sus referencias asociadas al catálogo actual; no es necesario reentrenar el encoder.
