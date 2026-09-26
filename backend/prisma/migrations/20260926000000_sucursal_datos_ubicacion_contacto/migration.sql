ALTER TABLE `sucursales_perfiles`
    ADD COLUMN `departamento` VARCHAR(100) NULL,
    ADD COLUMN `provincia` VARCHAR(100) NULL,
    ADD COLUMN `distrito` VARCHAR(100) NULL,
    ADD COLUMN `direccion_comercial` VARCHAR(255) NULL,
    ADD COLUMN `direccion_fiscal` VARCHAR(255) NULL,
    ADD COLUMN `direccion_web` VARCHAR(255) NULL,
    ADD COLUMN `igv` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    ADD COLUMN `correo` VARCHAR(255) NULL;

-- Conservar las direcciones existentes como referencia editable en ambos campos.
UPDATE `sucursales_perfiles`
SET `direccion_comercial` = `direccion`, `direccion_fiscal` = `direccion`
WHERE `direccion` IS NOT NULL;

ALTER TABLE `sucursales_perfiles` DROP COLUMN `direccion`;
