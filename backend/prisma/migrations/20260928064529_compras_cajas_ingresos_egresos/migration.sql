/*
  Warnings:

  - You are about to drop the column `id_sucursal` on the `proveedores` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_tipo_documento,numero_documento]` on the table `proveedores` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `proveedores` DROP FOREIGN KEY `proveedores_id_sucursal_fkey`;

-- DropIndex
DROP INDEX `proveedores_id_sucursal_activo_idx` ON `proveedores`;

-- DropIndex
DROP INDEX `proveedores_id_sucursal_id_tipo_documento_numero_documento_key` ON `proveedores`;

-- AlterTable
ALTER TABLE `almacenes` ADD COLUMN `tipo` ENUM('ALMACEN', 'AREA_VENTA') NOT NULL DEFAULT 'ALMACEN';

-- AlterTable
ALTER TABLE `inventario_movimientos` ADD COLUMN `id_compra_detalle` INTEGER NULL,
    ADD COLUMN `id_ingreso_producto` INTEGER NULL;

-- AlterTable
ALTER TABLE `proveedores` DROP COLUMN `id_sucursal`,
    ADD COLUMN `aplica_percepcion_por_defecto` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `cajas` (
    `id_caja` INTEGER NOT NULL AUTO_INCREMENT,
    `id_sucursal` INTEGER NOT NULL,
    `id_usuario_apertura` INTEGER NOT NULL,
    `fecha_apertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `monto_apertura` DECIMAL(14, 2) NOT NULL,
    `id_usuario_cierre` INTEGER NULL,
    `fecha_cierre` DATETIME(3) NULL,
    `monto_cierre` DECIMAL(14, 2) NULL,

    INDEX `cajas_id_sucursal_fecha_cierre_idx`(`id_sucursal`, `fecha_cierre`),
    UNIQUE INDEX `cajas_id_caja_id_sucursal_key`(`id_caja`, `id_sucursal`),
    PRIMARY KEY (`id_caja`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caja_detalle` (
    `id_caja` INTEGER NOT NULL,
    `id_medio_pago` INTEGER NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,

    PRIMARY KEY (`id_caja`, `id_medio_pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `motivo_ingreso` (
    `id_motivo_ingreso` INTEGER NOT NULL AUTO_INCREMENT,
    `motivo` VARCHAR(100) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `motivo_ingreso_motivo_key`(`motivo`),
    PRIMARY KEY (`id_motivo_ingreso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `motivo_egreso` (
    `id_motivo_egreso` INTEGER NOT NULL AUTO_INCREMENT,
    `motivo` VARCHAR(100) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `motivo_egreso_motivo_key`(`motivo`),
    PRIMARY KEY (`id_motivo_egreso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingresos` (
    `id_ingreso` INTEGER NOT NULL AUTO_INCREMENT,
    `id_caja` INTEGER NOT NULL,
    `id_sucursal` INTEGER NOT NULL,
    `id_motivo_ingreso` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,
    `detalle` VARCHAR(500) NULL,
    `fecha_ingreso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ingresos_id_caja_fecha_ingreso_idx`(`id_caja`, `fecha_ingreso`),
    PRIMARY KEY (`id_ingreso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `egresos` (
    `id_egreso` INTEGER NOT NULL AUTO_INCREMENT,
    `id_caja` INTEGER NOT NULL,
    `id_sucursal` INTEGER NOT NULL,
    `id_motivo_egreso` INTEGER NOT NULL,
    `id_compra` INTEGER NULL,
    `id_usuario` INTEGER NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,
    `detalle` VARCHAR(500) NULL,
    `fecha_egreso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `egresos_id_caja_fecha_egreso_idx`(`id_caja`, `fecha_egreso`),
    UNIQUE INDEX `egresos_id_egreso_id_compra_key`(`id_egreso`, `id_compra`),
    PRIMARY KEY (`id_egreso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingresos_detalle_pago` (
    `id_ingreso` INTEGER NOT NULL,
    `id_medio_pago` INTEGER NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,

    PRIMARY KEY (`id_ingreso`, `id_medio_pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `egresos_detalle_pago` (
    `id_egreso` INTEGER NOT NULL,
    `id_medio_pago` INTEGER NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,

    PRIMARY KEY (`id_egreso`, `id_medio_pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compras` (
    `id_compra` INTEGER NOT NULL AUTO_INCREMENT,
    `id_proveedor` INTEGER NULL,
    `nombre_proveedor` VARCHAR(255) NOT NULL,
    `id_sucursal` INTEGER NOT NULL,
    `id_almacen` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_compra` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subtotal` DECIMAL(14, 2) NULL,
    `igv` DECIMAL(14, 2) NULL,
    `total` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `compras_id_sucursal_fecha_compra_idx`(`id_sucursal`, `fecha_compra`),
    UNIQUE INDEX `compras_id_compra_id_sucursal_key`(`id_compra`, `id_sucursal`),
    PRIMARY KEY (`id_compra`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compras_detalle` (
    `id_compra_detalle` INTEGER NOT NULL AUTO_INCREMENT,
    `id_compra` INTEGER NOT NULL,
    `id_producto_sucursal` INTEGER NOT NULL,
    `cantidad` DECIMAL(14, 3) NOT NULL,
    `precio_unitario` DECIMAL(14, 4) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `compras_detalle_id_compra_idx`(`id_compra`),
    PRIMARY KEY (`id_compra_detalle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_comprobante` (
    `id_tipo_comprobante` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `codigo_sunat` VARCHAR(2) NULL,

    UNIQUE INDEX `tipos_comprobante_nombre_key`(`nombre`),
    UNIQUE INDEX `tipos_comprobante_codigo_sunat_key`(`codigo_sunat`),
    PRIMARY KEY (`id_tipo_comprobante`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comprobantes` (
    `id_comprobante` INTEGER NOT NULL AUTO_INCREMENT,
    `id_compra` INTEGER NOT NULL,
    `id_tipo_comprobante` INTEGER NOT NULL,
    `serie` VARCHAR(20) NULL,
    `numero` VARCHAR(40) NULL,
    `fecha_emision` DATE NOT NULL,

    UNIQUE INDEX `comprobantes_id_compra_key`(`id_compra`),
    PRIMARY KEY (`id_comprobante`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compras_percepciones` (
    `id_percepcion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_compra` INTEGER NOT NULL,
    `id_egreso` INTEGER NOT NULL,
    `fecha_percepcion` DATE NOT NULL,
    `base_calculo` DECIMAL(14, 2) NOT NULL,
    `porcentaje` DECIMAL(6, 3) NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,
    `numero_constancia` VARCHAR(80) NULL,

    UNIQUE INDEX `compras_percepciones_id_compra_id_egreso_key`(`id_compra`, `id_egreso`),
    PRIMARY KEY (`id_percepcion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingresos_productos` (
    `id_ingreso_producto` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ingreso` INTEGER NOT NULL,
    `id_producto_sucursal` INTEGER NOT NULL,
    `id_almacen` INTEGER NOT NULL,
    `cantidad` DECIMAL(14, 3) NOT NULL,
    `precio_unitario` DECIMAL(14, 4) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ingresos_productos_id_ingreso_idx`(`id_ingreso`),
    PRIMARY KEY (`id_ingreso_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deudas_clientes` (
    `id_deuda_cliente` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cliente` INTEGER NOT NULL,
    `id_ingreso_origen` INTEGER NOT NULL,
    `id_egreso` INTEGER NOT NULL,
    `fecha_vencimiento` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `deudas_clientes_id_ingreso_origen_key`(`id_ingreso_origen`),
    UNIQUE INDEX `deudas_clientes_id_egreso_key`(`id_egreso`),
    INDEX `deudas_clientes_id_cliente_idx`(`id_cliente`),
    PRIMARY KEY (`id_deuda_cliente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `abonos_deuda_cliente` (
    `id_deuda_cliente` INTEGER NOT NULL,
    `id_ingreso_abono` INTEGER NOT NULL,

    UNIQUE INDEX `abonos_deuda_cliente_id_ingreso_abono_key`(`id_ingreso_abono`),
    PRIMARY KEY (`id_deuda_cliente`, `id_ingreso_abono`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `proveedores_activo_idx` ON `proveedores`(`activo`);

-- CreateIndex
CREATE UNIQUE INDEX `proveedores_id_tipo_documento_numero_documento_key` ON `proveedores`(`id_tipo_documento`, `numero_documento`);

-- AddForeignKey
ALTER TABLE `cajas` ADD CONSTRAINT `cajas_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cajas` ADD CONSTRAINT `cajas_id_usuario_apertura_fkey` FOREIGN KEY (`id_usuario_apertura`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cajas` ADD CONSTRAINT `cajas_id_usuario_cierre_fkey` FOREIGN KEY (`id_usuario_cierre`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caja_detalle` ADD CONSTRAINT `caja_detalle_id_caja_fkey` FOREIGN KEY (`id_caja`) REFERENCES `cajas`(`id_caja`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caja_detalle` ADD CONSTRAINT `caja_detalle_id_medio_pago_fkey` FOREIGN KEY (`id_medio_pago`) REFERENCES `medios_pago`(`id_medio_pago`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_id_caja_id_sucursal_fkey` FOREIGN KEY (`id_caja`, `id_sucursal`) REFERENCES `cajas`(`id_caja`, `id_sucursal`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_id_motivo_ingreso_fkey` FOREIGN KEY (`id_motivo_ingreso`) REFERENCES `motivo_ingreso`(`id_motivo_ingreso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `egresos` ADD CONSTRAINT `egresos_id_caja_id_sucursal_fkey` FOREIGN KEY (`id_caja`, `id_sucursal`) REFERENCES `cajas`(`id_caja`, `id_sucursal`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `egresos` ADD CONSTRAINT `egresos_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `egresos` ADD CONSTRAINT `egresos_id_compra_id_sucursal_fkey` FOREIGN KEY (`id_compra`, `id_sucursal`) REFERENCES `compras`(`id_compra`, `id_sucursal`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `egresos` ADD CONSTRAINT `egresos_id_motivo_egreso_fkey` FOREIGN KEY (`id_motivo_egreso`) REFERENCES `motivo_egreso`(`id_motivo_egreso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `egresos` ADD CONSTRAINT `egresos_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos_detalle_pago` ADD CONSTRAINT `ingresos_detalle_pago_id_ingreso_fkey` FOREIGN KEY (`id_ingreso`) REFERENCES `ingresos`(`id_ingreso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos_detalle_pago` ADD CONSTRAINT `ingresos_detalle_pago_id_medio_pago_fkey` FOREIGN KEY (`id_medio_pago`) REFERENCES `medios_pago`(`id_medio_pago`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `egresos_detalle_pago` ADD CONSTRAINT `egresos_detalle_pago_id_egreso_fkey` FOREIGN KEY (`id_egreso`) REFERENCES `egresos`(`id_egreso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `egresos_detalle_pago` ADD CONSTRAINT `egresos_detalle_pago_id_medio_pago_fkey` FOREIGN KEY (`id_medio_pago`) REFERENCES `medios_pago`(`id_medio_pago`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_movimientos` ADD CONSTRAINT `inventario_movimientos_id_compra_detalle_fkey` FOREIGN KEY (`id_compra_detalle`) REFERENCES `compras_detalle`(`id_compra_detalle`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_movimientos` ADD CONSTRAINT `inventario_movimientos_id_ingreso_producto_fkey` FOREIGN KEY (`id_ingreso_producto`) REFERENCES `ingresos_productos`(`id_ingreso_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras` ADD CONSTRAINT `compras_id_proveedor_fkey` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores`(`id_proveedor`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras` ADD CONSTRAINT `compras_id_sucursal_fkey` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales`(`id_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras` ADD CONSTRAINT `compras_id_almacen_id_sucursal_fkey` FOREIGN KEY (`id_almacen`, `id_sucursal`) REFERENCES `almacenes`(`id_almacen`, `id_sucursal`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `compras` ADD CONSTRAINT `compras_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_detalle` ADD CONSTRAINT `compras_detalle_id_compra_fkey` FOREIGN KEY (`id_compra`) REFERENCES `compras`(`id_compra`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_detalle` ADD CONSTRAINT `compras_detalle_id_producto_sucursal_fkey` FOREIGN KEY (`id_producto_sucursal`) REFERENCES `producto_sucursal`(`id_producto_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comprobantes` ADD CONSTRAINT `comprobantes_id_compra_fkey` FOREIGN KEY (`id_compra`) REFERENCES `compras`(`id_compra`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comprobantes` ADD CONSTRAINT `comprobantes_id_tipo_comprobante_fkey` FOREIGN KEY (`id_tipo_comprobante`) REFERENCES `tipos_comprobante`(`id_tipo_comprobante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_percepciones` ADD CONSTRAINT `compras_percepciones_id_compra_fkey` FOREIGN KEY (`id_compra`) REFERENCES `compras`(`id_compra`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras_percepciones` ADD CONSTRAINT `compras_percepciones_id_egreso_id_compra_fkey` FOREIGN KEY (`id_egreso`, `id_compra`) REFERENCES `egresos`(`id_egreso`, `id_compra`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ingresos_productos` ADD CONSTRAINT `ingresos_productos_id_ingreso_fkey` FOREIGN KEY (`id_ingreso`) REFERENCES `ingresos`(`id_ingreso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos_productos` ADD CONSTRAINT `ingresos_productos_id_producto_sucursal_fkey` FOREIGN KEY (`id_producto_sucursal`) REFERENCES `producto_sucursal`(`id_producto_sucursal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos_productos` ADD CONSTRAINT `ingresos_productos_id_almacen_fkey` FOREIGN KEY (`id_almacen`) REFERENCES `almacenes`(`id_almacen`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deudas_clientes` ADD CONSTRAINT `deudas_clientes_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `clientes`(`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deudas_clientes` ADD CONSTRAINT `deudas_clientes_id_ingreso_origen_fkey` FOREIGN KEY (`id_ingreso_origen`) REFERENCES `ingresos`(`id_ingreso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deudas_clientes` ADD CONSTRAINT `deudas_clientes_id_egreso_fkey` FOREIGN KEY (`id_egreso`) REFERENCES `egresos`(`id_egreso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `abonos_deuda_cliente` ADD CONSTRAINT `abonos_deuda_cliente_id_deuda_cliente_fkey` FOREIGN KEY (`id_deuda_cliente`) REFERENCES `deudas_clientes`(`id_deuda_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `abonos_deuda_cliente` ADD CONSTRAINT `abonos_deuda_cliente_id_ingreso_abono_fkey` FOREIGN KEY (`id_ingreso_abono`) REFERENCES `ingresos`(`id_ingreso`) ON DELETE RESTRICT ON UPDATE CASCADE;
