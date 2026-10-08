CREATE TABLE `referencias_visuales` (
    `id_referencia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_producto` INTEGER NOT NULL,
    `archivo` VARCHAR(100) NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `mime_type` VARCHAR(30) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `estado` ENUM('PENDIENTE', 'PROCESANDO', 'DISPONIBLE', 'ERROR', 'RETIRADA') NOT NULL DEFAULT 'PENDIENTE',
    `modelo_version` VARCHAR(255) NULL,
    `dimension` INTEGER NULL,
    `intentos` INTEGER NOT NULL DEFAULT 0,
    `ultimo_error` VARCHAR(500) NULL,
    `proximo_intento` DATETIME(3) NULL,
    `lease_token` VARCHAR(36) NULL,
    `bloqueado_hasta` DATETIME(3) NULL,
    `indexado_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `referencias_visuales_id_producto_sha256_key` (`id_producto`, `sha256`),
    INDEX `referencias_visuales_estado_proximo_intento_idx` (`estado`, `proximo_intento`),
    PRIMARY KEY (`id_referencia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `referencias_visuales` ADD CONSTRAINT `referencias_visuales_id_producto_fkey`
FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;
