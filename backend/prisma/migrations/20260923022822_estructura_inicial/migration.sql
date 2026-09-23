-- CreateTable
CREATE TABLE `estados` (
    `id_estado` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `estados_nombre_key`(`nombre`),
    PRIMARY KEY (`id_estado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_documento` (
    `id_tipo_documento` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tipos_documento_nombre_key`(`nombre`),
    PRIMARY KEY (`id_tipo_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `correo` VARCHAR(255) NOT NULL,
    `contrasena` VARCHAR(255) NOT NULL,
    `id_estado` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_correo_key`(`correo`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios_perfiles` (
    `id_usuario` INTEGER NOT NULL,
    `nombres` VARCHAR(255) NOT NULL,
    `apellidos` VARCHAR(255) NOT NULL,
    `id_tipo_documento` INTEGER NULL,
    `numero_documento` VARCHAR(20) NULL,
    `telefono` VARCHAR(20) NULL,
    `direccion` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_perfiles_id_tipo_documento_numero_documento_key`(`id_tipo_documento`, `numero_documento`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id_rol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_nombre_key`(`nombre`),
    PRIMARY KEY (`id_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permisos` (
    `id_permiso` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permisos_nombre_key`(`nombre`),
    PRIMARY KEY (`id_permiso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios_roles` (
    `id_usuario` INTEGER NOT NULL,
    `id_rol` INTEGER NOT NULL,

    PRIMARY KEY (`id_usuario`, `id_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles_permisos` (
    `id_rol` INTEGER NOT NULL,
    `id_permiso` INTEGER NOT NULL,

    PRIMARY KEY (`id_rol`, `id_permiso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sucursales` (
    `id_sucursal` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id_sucursal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sucursales_perfiles` (
    `id_sucursal` INTEGER NOT NULL,
    `id_tipo_documento` INTEGER NULL,
    `numero_documento` VARCHAR(20) NULL,
    `razon_social` VARCHAR(255) NULL,
    `nombre_comercial` VARCHAR(255) NULL,
    `direccion` VARCHAR(255) NULL,
    `ubigeo` VARCHAR(6) NULL,
    `telefono` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id_sucursal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios_sucursales` (
    `id_usuario` INTEGER NOT NULL,
    `id_sucursal` INTEGER NOT NULL,

    PRIMARY KEY (`id_usuario`, `id_sucursal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_id_estado_fkey` FOREIGN KEY (`id_estado`) REFERENCES `estados`(`id_estado`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_perfiles` ADD CONSTRAINT `usuarios_perfiles_id_tipo_documento_fkey` FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipos_documento`(`id_tipo_documento`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_perfiles` ADD CONSTRAINT `usuarios_perfiles_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_roles` ADD CONSTRAINT `usuarios_roles_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_roles` ADD CONSTRAINT `usuarios_roles_id_rol_fkey` FOREIGN KEY (`id_rol`) REFERENCES `roles`(`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles_permisos` ADD CONSTRAINT `roles_permisos_id_rol_fkey` FOREIGN KEY (`id_rol`) REFERENCES `roles`(`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles_permisos` ADD CONSTRAINT `roles_permisos_id_permiso_fkey` FOREIGN KEY (`id_permiso`) REFERENCES `permisos`(`id_permiso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sucursales_perfiles` ADD CONSTRAINT `sucursales_perfiles_id_tipo_documento_fkey` FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipos_documento`(`id_tipo_documento`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sucursales_perfiles` ADD CONSTRAINT `sucursales_perfiles_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_sucursales` ADD CONSTRAINT `usuarios_sucursales_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_sucursales` ADD CONSTRAINT `usuarios_sucursales_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE CASCADE ON UPDATE CASCADE;
