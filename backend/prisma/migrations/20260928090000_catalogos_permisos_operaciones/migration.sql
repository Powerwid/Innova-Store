-- Catálogos de caja, compras y ventas con identificadores estables usados por
-- la lógica de negocio.
INSERT INTO `motivo_ingreso` (`id_motivo_ingreso`, `motivo`, `activo`) VALUES
  (1, 'Venta', true),
  (2, 'Abono de deuda', true),
  (3, 'Otro ingreso', true)
ON DUPLICATE KEY UPDATE
  `motivo` = VALUES(`motivo`),
  `activo` = VALUES(`activo`);

INSERT INTO `motivo_egreso` (`id_motivo_egreso`, `motivo`, `activo`) VALUES
  (1, 'Compra', true),
  (2, 'Percepción', true),
  (3, 'Crédito a cliente', true),
  (4, 'Otro egreso', true)
ON DUPLICATE KEY UPDATE
  `motivo` = VALUES(`motivo`),
  `activo` = VALUES(`activo`);

INSERT INTO `tipos_comprobante`
  (`id_tipo_comprobante`, `nombre`, `codigo_sunat`)
VALUES
  (1, 'Factura', '01'),
  (2, 'Boleta de venta', '03'),
  (3, 'Nota de crédito', '07'),
  (4, 'Nota de débito', '08'),
  (5, 'Ticket', '12'),
  (6, 'Nota de pedido', NULL)
ON DUPLICATE KEY UPDATE
  `nombre` = VALUES(`nombre`),
  `codigo_sunat` = VALUES(`codigo_sunat`);

-- Compra y venta son movimientos generados por sus respectivos procesos y no
-- reemplazan a los ajustes manuales del kardex.
INSERT INTO `tipos_movimiento_inventario`
  (`id_tipo_movimiento`, `nombre`, `entrada_salida`)
VALUES
  (5, 'Compra', 'ENTRADA'),
  (6, 'Venta', 'SALIDA')
ON DUPLICATE KEY UPDATE
  `nombre` = VALUES(`nombre`),
  `entrada_salida` = VALUES(`entrada_salida`);

INSERT INTO `permisos` (`nombre`) VALUES
  ('CAJA_VER'),
  ('CAJA_GESTIONAR'),
  ('VENTAS_VER'),
  ('VENTAS_GESTIONAR'),
  ('COMPRAS_VER'),
  ('COMPRAS_GESTIONAR'),
  ('DEUDAS_VER'),
  ('DEUDAS_GESTIONAR')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT IGNORE INTO `roles_permisos` (`id_rol`, `id_permiso`)
SELECT rol.`id_rol`, permiso.`id_permiso`
FROM `roles` rol
CROSS JOIN `permisos` permiso
WHERE rol.`nombre` = 'SUPERADMIN'
  AND permiso.`nombre` IN (
    'CAJA_VER', 'CAJA_GESTIONAR',
    'VENTAS_VER', 'VENTAS_GESTIONAR',
    'COMPRAS_VER', 'COMPRAS_GESTIONAR',
    'DEUDAS_VER', 'DEUDAS_GESTIONAR'
  );
