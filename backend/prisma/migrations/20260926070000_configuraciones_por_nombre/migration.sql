-- Se conserva el valor actual de la opción de stock.
ALTER TABLE `configuraciones_globales`
  DROP CONSTRAINT `ck_configuracion_global_unica`;

ALTER TABLE `configuraciones_globales`
  CHANGE COLUMN `permite_stock_negativo` `activo` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `nombre` VARCHAR(100) NULL;

UPDATE `configuraciones_globales`
SET `nombre` = 'STOCK_NEGATIVO'
WHERE `id_configuracion` = 1;

ALTER TABLE `configuraciones_globales`
  MODIFY `nombre` VARCHAR(100) NOT NULL,
  DROP PRIMARY KEY,
  DROP COLUMN `id_configuracion`,
  ADD PRIMARY KEY (`nombre`);
