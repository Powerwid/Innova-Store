ALTER TABLE `ingresos`
  ADD COLUMN `clave_operacion` VARCHAR(36) NULL,
  ADD COLUMN `huella_operacion` VARCHAR(64) NULL;
CREATE UNIQUE INDEX `ingresos_clave_operacion_key` ON `ingresos`(`clave_operacion`);
