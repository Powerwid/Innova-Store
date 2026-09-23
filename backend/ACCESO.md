# Autenticación y control de acceso

El backend usa JWT Bearer. `POST /auth/login` recibe `correo` y `contrasena` y devuelve `accessToken`, con vigencia de una hora. El cliente lo envía como `Authorization: Bearer <token>`. `GET /auth/me` devuelve el usuario, sus roles activos y sus permisos actuales. `PATCH /auth/contrasena` cambia la contraseña propia y exige la anterior.

Todas las rutas requieren autenticación salvo las marcadas expresamente con `@Public()`. Además, una ruta autenticada debe declarar una política: `@RequierePermiso('CODIGO')`, `@RequiereRol('NOMBRE')`, `@SoloSuperadmin()` o `@Autenticado()`. El acceso sin política se deniega. `EstadoGuard` exige por defecto el estado `ACTIVO`; `@EstadosPermitidos(...)` permite declarar otros estados cuando una operación lo necesite.

Los roles y los permisos se resuelven desde MySQL en cada solicitud. Los permisos de un usuario son la unión de los permisos de sus roles activos. El nombre reservado `SUPERADMIN` tiene acceso total incluso sin filas en `roles_permisos`. Solo ese rol puede usar las rutas de administración de roles y permisos; el servicio vuelve a comprobarlo. `RolesGuard` admite nombres de rol dinámicos, pero las operaciones normales deben preferir permisos.

La gestión de acceso vive dentro de `UsuariosModule`:

- `GET/POST /roles`, `PATCH/DELETE /roles/:idRol` para consultar, crear, editar y desactivar roles.
- `POST /usuarios/:idUsuario/roles` y `DELETE /usuarios/:idUsuario/roles/:idRol` para asignar o retirar roles.
- `GET /permisos`, `POST /roles/:idRol/permisos` y `DELETE /roles/:idRol/permisos/:idPermiso` para el catálogo y las asignaciones.

`SUPERADMIN` no puede renombrarse ni desactivarse. No se puede retirar el último superadmin activo. La edición y desactivación general de usuarios tampoco puede actuar sobre una cuenta superadmin. `DELETE /usuarios/:id` cambia el estado a `INACTIVO` y conserva sus relaciones.

Los códigos de permiso se añaden al catálogo en `prisma/seeds/usuarios/permisos.seed.ts`. El seed no vuelve a conceder permisos a los roles: las asignaciones quedan bajo control del superadmin. Los usuarios creados por la API nacen sin rol; únicamente el superadmin puede asignárselo.

Para iniciar la base, configure las variables de `.env.example`, aplique las migraciones de Prisma y ejecute el seed. No coloque secretos reales en el repositorio. El frontend actual es todavía la plantilla de Vite y no consume estos endpoints.
