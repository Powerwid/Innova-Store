# Autenticación y control de acceso

El backend usa JWT en cookies `HttpOnly`. `POST /api/auth/login` recibe `correo` y `contrasena`, establece `access_token` (2 horas) y `refresh_token` (7 días), y devuelve solo los datos básicos del usuario. Ambos JWT usan `JWT_SECRET`; el campo `tipo` impide usar uno en lugar del otro. La estrategia JWT lee `access_token` desde las cookies; no lee el encabezado `Authorization`. Cuando el acceso expira, la siguiente petición protegida usa automáticamente la cookie de renovación, continúa la operación y recibe una nueva cookie de acceso. No se renueva en cada petición mientras el acceso siga vigente. `POST /api/auth/refresh` también permite renovar de forma explícita. `POST /api/auth/logout` borra ambas cookies. `GET /api/auth/me` devuelve el usuario, sus roles activos y permisos actuales. `PATCH /api/auth/contrasena` cambia la contraseña propia y exige la anterior.

Las cookies usan `SameSite=Lax`; en producción también usan `Secure`. La cookie de renovación se envía a las rutas `/api` para permitir la renovación automática. En desarrollo, Vite sirve React en `http://localhost:5173` y reenvía `/api` al backend; el frontend debe usar rutas relativas como `/api/auth/me`. En producción Nest sirve el frontend compilado y `/api` bajo el mismo origen. En una colección de pruebas basta `base_url=http://localhost:3000/api`: el cliente HTTP debe conservar las cookies después del login; no necesita una variable `access_token`.

El cierre de sesión borra las cookies del navegador. Los JWT de renovación ya emitidos no se almacenan ni revocan en el servidor, por lo que un token copiado antes del cierre seguirá siendo válido hasta que expire. La estrategia consulta el estado del usuario al renovar y rechaza cuentas inactivas.

Todas las rutas requieren autenticación salvo las marcadas expresamente con `@Public()`. Además, una ruta autenticada debe declarar una política: `@RequierePermiso('CODIGO')`, `@RequiereRol('NOMBRE')`, `@SoloSuperadmin()` o `@Autenticado()`. El acceso sin política se deniega. `EstadoGuard` exige por defecto el estado `ACTIVO`; `@EstadosPermitidos(...)` permite declarar otros estados cuando una operación lo necesite.

Los roles y los permisos se resuelven desde MySQL en cada solicitud. Los permisos de un usuario son la unión de los permisos de sus roles activos. El nombre reservado `SUPERADMIN` tiene acceso total incluso sin filas en `roles_permisos`. Solo ese rol puede usar las rutas de administración de roles y permisos; el servicio vuelve a comprobarlo. `RolesGuard` admite nombres de rol dinámicos, pero las operaciones normales deben preferir permisos.

La gestión de acceso vive dentro de `UsuariosModule`:

- `GET/POST /api/roles`, `PATCH /api/roles/:idRol` para consultar, crear y editar roles, incluido `activo: true/false`.
- `POST /api/usuarios/:idUsuario/roles` y `DELETE /api/usuarios/:idUsuario/roles/:idRol` para asignar o retirar roles.
- `GET /api/permisos`, `POST /api/roles/:idRol/permisos` y `DELETE /api/roles/:idRol/permisos/:idPermiso` para el catálogo y las asignaciones.

`SUPERADMIN` no puede renombrarse ni desactivarse. No se puede retirar el último superadmin activo. La edición y los cambios de estado generales tampoco pueden actuar sobre una cuenta superadmin. `PATCH /api/usuarios/:id` permite actualizar datos y habilitar o deshabilitar con `{ "estado": "ACTIVO" }` o `{ "estado": "INACTIVO" }`; no borra físicamente al usuario. Para datos se exige `USUARIOS_EDITAR`, para activar `USUARIOS_ACTIVAR` y para desactivar `USUARIOS_ELIMINAR`; una petición que combina cambios necesita todos los permisos correspondientes. `BLOQUEADO` no se cambia desde esta ruta. Un rol desactivado se reactiva con `PATCH /api/roles/:idRol` y `{ "activo": true }` (solo SUPERADMIN).

Los códigos de permiso se añaden al catálogo en `prisma/seeds/usuarios/permisos.seed.ts`. El seed no vuelve a conceder permisos a los roles: las asignaciones quedan bajo control del superadmin. Los usuarios creados por la API nacen sin rol; únicamente el superadmin puede asignárselo.

Para iniciar la base, configure las variables de `.env.example`, aplique las migraciones de Prisma y ejecute el seed. No coloque secretos reales en el repositorio. El frontend actual es todavía la plantilla de Vite y no consume estos endpoints.
