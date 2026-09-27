-- Permisos generales por módulo. La migración mantiene los accesos que ya
-- tenían los roles antes de retirar los permisos demasiado específicos.
INSERT INTO `permisos` (`nombre`) VALUES
  ('USUARIOS_GESTIONAR'),
  ('SUCURSALES_GESTIONAR'),
  ('MEDIOS_PAGO_GESTIONAR'),
  ('PERSONAS_GESTIONAR')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- Usuarios: cualquier permiso operativo anterior habilita la gestión.
INSERT IGNORE INTO `roles_permisos` (`id_rol`, `id_permiso`)
SELECT DISTINCT rp.`id_rol`, nuevo.`id_permiso`
FROM `roles_permisos` rp
JOIN `permisos` anterior ON anterior.`id_permiso` = rp.`id_permiso`
JOIN `permisos` nuevo ON nuevo.`nombre` = 'USUARIOS_GESTIONAR'
WHERE anterior.`nombre` IN (
  'USUARIOS_CREAR', 'USUARIOS_EDITAR', 'USUARIOS_ACTIVAR',
  'USUARIOS_DESACTIVAR', 'USUARIOS_ASIGNAR_SUCURSALES'
);

-- Sucursales.
INSERT IGNORE INTO `roles_permisos` (`id_rol`, `id_permiso`)
SELECT DISTINCT rp.`id_rol`, nuevo.`id_permiso`
FROM `roles_permisos` rp
JOIN `permisos` anterior ON anterior.`id_permiso` = rp.`id_permiso`
JOIN `permisos` nuevo ON nuevo.`nombre` = 'SUCURSALES_GESTIONAR'
WHERE anterior.`nombre` IN (
  'SUCURSALES_CREAR', 'SUCURSALES_EDITAR',
  'SUCURSALES_ACTIVAR', 'SUCURSALES_DESACTIVAR'
);

-- Medios de pago.
INSERT IGNORE INTO `roles_permisos` (`id_rol`, `id_permiso`)
SELECT DISTINCT rp.`id_rol`, nuevo.`id_permiso`
FROM `roles_permisos` rp
JOIN `permisos` anterior ON anterior.`id_permiso` = rp.`id_permiso`
JOIN `permisos` nuevo ON nuevo.`nombre` = 'MEDIOS_PAGO_GESTIONAR'
WHERE anterior.`nombre` IN (
  'MEDIOS_PAGO_CREAR', 'MEDIOS_PAGO_EDITAR', 'MEDIOS_PAGO_ELIMINAR'
);

-- Clientes y proveedores comparten una única capacidad de gestión.
INSERT IGNORE INTO `roles_permisos` (`id_rol`, `id_permiso`)
SELECT DISTINCT rp.`id_rol`, nuevo.`id_permiso`
FROM `roles_permisos` rp
JOIN `permisos` anterior ON anterior.`id_permiso` = rp.`id_permiso`
JOIN `permisos` nuevo ON nuevo.`nombre` = 'PERSONAS_GESTIONAR'
WHERE anterior.`nombre` IN (
  'CLIENTES_CREAR', 'CLIENTES_EDITAR', 'CLIENTES_ELIMINAR',
  'PROVEEDORES_CREAR', 'PROVEEDORES_EDITAR', 'PROVEEDORES_ELIMINAR'
);

-- Si un rol tenía una acción interna pero no el permiso de lectura, se le
-- conserva acceso al módulo para que pueda seguir utilizándolo desde el menú.
INSERT IGNORE INTO `roles_permisos` (`id_rol`, `id_permiso`)
SELECT DISTINCT rp.`id_rol`, lectura.`id_permiso`
FROM `roles_permisos` rp
JOIN `permisos` gestion ON gestion.`id_permiso` = rp.`id_permiso`
JOIN `permisos` lectura ON lectura.`nombre` = CASE gestion.`nombre`
  WHEN 'USUARIOS_GESTIONAR' THEN 'USUARIOS_VER'
  WHEN 'SUCURSALES_GESTIONAR' THEN 'SUCURSALES_VER'
  WHEN 'MEDIOS_PAGO_GESTIONAR' THEN 'MEDIOS_PAGO_VER'
  WHEN 'PERSONAS_GESTIONAR' THEN 'PERSONAS_VER'
END
WHERE gestion.`nombre` IN (
  'USUARIOS_GESTIONAR', 'SUCURSALES_GESTIONAR',
  'MEDIOS_PAGO_GESTIONAR', 'PERSONAS_GESTIONAR'
);

DELETE FROM `permisos`
WHERE `nombre` IN (
  'USUARIOS_CREAR', 'USUARIOS_EDITAR', 'USUARIOS_ACTIVAR',
  'USUARIOS_DESACTIVAR', 'USUARIOS_ASIGNAR_SUCURSALES',
  'SUCURSALES_CREAR', 'SUCURSALES_EDITAR',
  'SUCURSALES_ACTIVAR', 'SUCURSALES_DESACTIVAR',
  'MEDIOS_PAGO_CREAR', 'MEDIOS_PAGO_EDITAR', 'MEDIOS_PAGO_ELIMINAR',
  'CLIENTES_CREAR', 'CLIENTES_EDITAR', 'CLIENTES_ELIMINAR',
  'PROVEEDORES_CREAR', 'PROVEEDORES_EDITAR', 'PROVEEDORES_ELIMINAR'
);
