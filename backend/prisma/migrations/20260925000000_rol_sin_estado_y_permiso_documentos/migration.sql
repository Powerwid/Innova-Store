-- Los roles ya no tienen estado. La consulta de documentos es una ayuda
-- para los formularios y no requiere un permiso independiente.
ALTER TABLE `roles` DROP COLUMN `activo`;

DELETE FROM `permisos` WHERE `nombre` = 'DOCUMENTOS_CONSULTAR';
