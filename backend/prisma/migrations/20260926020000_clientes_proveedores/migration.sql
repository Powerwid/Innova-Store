-- CreateTable
CREATE TABLE `clientes` (
    `id_cliente` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `id_tipo_documento` INTEGER NOT NULL,
    `numero_documento` VARCHAR(20) NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `ubigeo` VARCHAR(6) NULL,
    `correo` VARCHAR(255) NULL,
    `telefono` VARCHAR(20) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `clientes_nombre_idx`(`nombre`),
    INDEX `clientes_activo_idx`(`activo`),
    UNIQUE INDEX `clientes_id_tipo_documento_numero_documento_key`(`id_tipo_documento`, `numero_documento`),
    PRIMARY KEY (`id_cliente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proveedores` (
    `id_proveedor` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `id_tipo_documento` INTEGER NOT NULL,
    `numero_documento` VARCHAR(20) NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `ubigeo` VARCHAR(6) NULL,
    `correo` VARCHAR(255) NULL,
    `telefono` VARCHAR(20) NULL,
    `id_sucursal` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `proveedores_nombre_idx`(`nombre`),
    INDEX `proveedores_id_sucursal_activo_idx`(`id_sucursal`, `activo`),
    UNIQUE INDEX `proveedores_id_sucursal_id_tipo_documento_numero_documento_key`(`id_sucursal`, `id_tipo_documento`, `numero_documento`),
    PRIMARY KEY (`id_proveedor`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_id_tipo_documento_fkey` FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipos_documento`(`id_tipo_documento`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proveedores` ADD CONSTRAINT `proveedores_id_tipo_documento_fkey` FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipos_documento`(`id_tipo_documento`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proveedores` ADD CONSTRAINT `proveedores_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;
