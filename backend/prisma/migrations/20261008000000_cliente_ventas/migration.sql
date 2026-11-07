ALTER TABLE `clientes` ADD COLUMN `es_generico` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ingresos` ADD COLUMN `id_cliente` INTEGER NULL;
CREATE INDEX `ingresos_id_cliente_idx` ON `ingresos`(`id_cliente`);
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `clientes`(`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE;
