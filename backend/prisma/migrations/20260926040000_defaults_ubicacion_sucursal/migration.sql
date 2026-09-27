UPDATE `sucursales_perfiles`
SET `departamento` = 'Arequipa'
WHERE `departamento` IS NULL OR TRIM(`departamento`) = '';

UPDATE `sucursales_perfiles`
SET `provincia` = 'Arequipa'
WHERE `provincia` IS NULL OR TRIM(`provincia`) = '';

UPDATE `sucursales_perfiles`
SET `distrito` = 'Arequipa'
WHERE `distrito` IS NULL OR TRIM(`distrito`) = '';

UPDATE `sucursales_perfiles`
SET `ubigeo` = '040101'
WHERE `ubigeo` IS NULL OR TRIM(`ubigeo`) = '';

UPDATE `sucursales_perfiles`
SET `telefono` = '-'
WHERE `telefono` IS NULL OR TRIM(`telefono`) = '';

ALTER TABLE `sucursales_perfiles`
  MODIFY `departamento` VARCHAR(100) NOT NULL DEFAULT 'Arequipa',
  MODIFY `provincia` VARCHAR(100) NOT NULL DEFAULT 'Arequipa',
  MODIFY `distrito` VARCHAR(100) NOT NULL DEFAULT 'Arequipa',
  MODIFY `ubigeo` VARCHAR(6) NOT NULL DEFAULT '040101',
  MODIFY `telefono` VARCHAR(20) NOT NULL DEFAULT '-';
