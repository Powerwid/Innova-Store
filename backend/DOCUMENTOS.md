# Consulta de DNI y RUC

`DocumentosModule` encapsula la consulta a Decolecta para usuarios y futuras sucursales. El frontend llama a una sola ruta del sistema y nunca recibe el token del proveedor.

```http
GET /api/documentos/DNI/12345678
GET /api/documentos/RUC/20123456789
```

La ruta requiere sesión y el permiso dinámico `DOCUMENTOS_CONSULTAR`; `SUPERADMIN` tiene acceso. No lleva cuerpo. El número debe ser numérico: 8 dígitos para DNI y 11 para RUC. El backend consulta Decolecta, verifica que el número de la respuesta coincida con el solicitado y convierte los textos para mostrarlos en los formularios.

Respuesta DNI:

```json
{
  "tipoDocumento": "DNI",
  "idTipoDocumento": 1,
  "numeroDocumento": "12345678",
  "nombres": "Joseph Kleyn",
  "apellidos": "Mamani Perez",
  "nombreCompleto": "Joseph Kleyn Mamani Perez"
}
```

Respuesta RUC:

```json
{
  "tipoDocumento": "RUC",
  "idTipoDocumento": 2,
  "numeroDocumento": "20123456789",
  "razonSocial": "Innova Store S.A.C.",
  "direccion": "Av. Jose Galvez 123",
  "ubigeo": "150131",
  "estadoSunat": "ACTIVO",
  "condicionSunat": "HABIDO"
}
```

Los identificadores de tipo de documento de estos ejemplos son ilustrativos: la respuesta utiliza los valores reales del catálogo. `estadoSunat` y `condicionSunat` se conservan como códigos; nombres, razón social y dirección se convierten a texto legible. La dirección de RUC es la dirección fiscal informada por el proveedor y debe poder editarse antes de guardarla como dirección de una sucursal.

Configure `DECOLECTA_TOKEN` en `backend/.env`, que Git ignora. `DECOLECTA_URL` es opcional y usa `https://api.decolecta.com/v1` por defecto. El token se envía únicamente desde el backend en el encabezado `Authorization: Bearer` y no aparece en las respuestas. Ejecute el seed de permisos para añadir `DOCUMENTOS_CONSULTAR` y asígnelo a los roles que puedan hacer consultas. El frontend actual aún no contiene formularios de usuarios ni sucursales para conectar esta ruta.
