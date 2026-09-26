CREATE TABLE `medios_pago` (
    `id_medio_pago` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(45) NOT NULL,

    UNIQUE INDEX `medios_pago_nombre_key`(`nombre`),
    PRIMARY KEY (`id_medio_pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
