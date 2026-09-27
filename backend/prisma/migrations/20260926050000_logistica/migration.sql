-- CreateTable
CREATE TABLE `tipos_producto` (
    `id_tipo_producto` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tipos_producto_nombre_key`(`nombre`),
    PRIMARY KEY (`id_tipo_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id_categoria` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `color` VARCHAR(7) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categorias_nombre_key`(`nombre`),
    PRIMARY KEY (`id_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unidades_medida` (
    `id_unidad_medida` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `simbolo` VARCHAR(10) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unidades_medida_nombre_key`(`nombre`),
    UNIQUE INDEX `unidades_medida_simbolo_key`(`simbolo`),
    PRIMARY KEY (`id_unidad_medida`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id_producto` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tipo_producto` INTEGER NOT NULL,
    `id_categoria` INTEGER NOT NULL,
    `id_unidad_medida` INTEGER NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `detalle` VARCHAR(500) NULL,
    `codigo_barras` VARCHAR(100) NULL,
    `imagen` VARCHAR(255) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `productos_nombre_idx`(`nombre`),
    PRIMARY KEY (`id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto_sucursal` (
    `id_producto_sucursal` INTEGER NOT NULL AUTO_INCREMENT,
    `id_producto` INTEGER NOT NULL,
    `id_sucursal` INTEGER NOT NULL,
    `precio_compra` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `precio_venta` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `producto_sucursal_id_producto_id_sucursal_key`(`id_producto`, `id_sucursal`),
    UNIQUE INDEX `producto_sucursal_id_producto_sucursal_id_sucursal_key`(`id_producto_sucursal`, `id_sucursal`),
    PRIMARY KEY (`id_producto_sucursal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `almacenes` (
    `id_almacen` INTEGER NOT NULL AUTO_INCREMENT,
    `id_sucursal` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `almacenes_id_sucursal_nombre_key`(`id_sucursal`, `nombre`),
    UNIQUE INDEX `almacenes_id_almacen_id_sucursal_key`(`id_almacen`, `id_sucursal`),
    PRIMARY KEY (`id_almacen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventarios` (
    `id_inventario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_producto_sucursal` INTEGER NOT NULL,
    `id_almacen` INTEGER NOT NULL,
    `id_sucursal` INTEGER NOT NULL,
    `stock` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `stock_minimo` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `inventarios_id_sucursal_idx`(`id_sucursal`),
    UNIQUE INDEX `inventarios_id_producto_sucursal_id_almacen_key`(`id_producto_sucursal`, `id_almacen`),
    PRIMARY KEY (`id_inventario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_movimiento_inventario` (
    `id_tipo_movimiento` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `entrada_salida` ENUM('ENTRADA', 'SALIDA') NOT NULL,

    UNIQUE INDEX `tipos_movimiento_inventario_nombre_key`(`nombre`),
    PRIMARY KEY (`id_tipo_movimiento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventario_movimientos` (
    `id_movimiento` INTEGER NOT NULL AUTO_INCREMENT,
    `id_inventario` INTEGER NOT NULL,
    `id_tipo_movimiento` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `cantidad` DECIMAL(14, 3) NOT NULL,
    `stock_anterior` DECIMAL(14, 3) NOT NULL,
    `stock_resultante` DECIMAL(14, 3) NOT NULL,
    `observacion` VARCHAR(500) NULL,
    `fecha_movimiento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventario_movimientos_id_inventario_fecha_movimiento_idx`(`id_inventario`, `fecha_movimiento`),
    PRIMARY KEY (`id_movimiento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_id_tipo_producto_fkey` FOREIGN KEY (`id_tipo_producto`) REFERENCES `tipos_producto`(`id_tipo_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categorias`(`id_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_id_unidad_medida_fkey` FOREIGN KEY (`id_unidad_medida`) REFERENCES `unidades_medida`(`id_unidad_medida`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_sucursal` ADD CONSTRAINT `producto_sucursal_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `productos`(`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_sucursal` ADD CONSTRAINT `producto_sucursal_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `almacenes` ADD CONSTRAINT `almacenes_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_id_producto_sucursal_id_sucursal_fkey` FOREIGN KEY (`id_producto_sucursal`, `id_sucursal`) REFERENCES `producto_sucursal`(`id_producto_sucursal`, `id_sucursal`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_id_almacen_id_sucursal_fkey` FOREIGN KEY (`id_almacen`, `id_sucursal`) REFERENCES `almacenes`(`id_almacen`, `id_sucursal`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `inventario_movimientos` ADD CONSTRAINT `inventario_movimientos_id_inventario_fkey` FOREIGN KEY (`id_inventario`) REFERENCES `inventarios`(`id_inventario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_movimientos` ADD CONSTRAINT `inventario_movimientos_id_tipo_movimiento_fkey` FOREIGN KEY (`id_tipo_movimiento`) REFERENCES `tipos_movimiento_inventario`(`id_tipo_movimiento`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_movimientos` ADD CONSTRAINT `inventario_movimientos_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Las cantidades y precios nunca pueden ser negativos.
ALTER TABLE producto_sucursal ADD CONSTRAINT ck_producto_sucursal_precios CHECK (precio_compra >= 0 AND precio_venta >= 0);
ALTER TABLE inventarios ADD CONSTRAINT ck_inventarios_stock CHECK (stock >= 0 AND stock_minimo >= 0);
ALTER TABLE inventario_movimientos ADD CONSTRAINT ck_movimientos_cantidad CHECK (cantidad > 0 AND stock_anterior >= 0 AND stock_resultante >= 0);

INSERT INTO tipos_movimiento_inventario (id_tipo_movimiento, nombre, entrada_salida) VALUES
(1, 'Stock inicial', 'ENTRADA'), (2, 'Ajuste de entrada', 'ENTRADA'),
(3, 'Ajuste de salida', 'SALIDA'), (4, 'Merma', 'SALIDA');

INSERT INTO permisos (nombre) VALUES ('LOGISTICA_VER'), ('LOGISTICA_GESTIONAR');
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM roles r CROSS JOIN permisos p
WHERE r.nombre = 'SUPERADMIN' AND p.nombre IN ('LOGISTICA_VER', 'LOGISTICA_GESTIONAR');
