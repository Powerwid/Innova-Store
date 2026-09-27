CREATE TABLE `configuraciones_globales` (
    `id_configuracion` INTEGER NOT NULL DEFAULT 1,
    `permite_stock_negativo` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    CONSTRAINT `ck_configuracion_global_unica` CHECK (`id_configuracion` = 1),
    PRIMARY KEY (`id_configuracion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `configuraciones_globales`
  (`id_configuracion`, `permite_stock_negativo`, `created_at`, `updated_at`)
VALUES (1, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- El stock mínimo sigue sin admitir negativos. El saldo y el historial sí pueden
-- contenerlos cuando la configuración global lo autoriza.
ALTER TABLE `inventarios` DROP CONSTRAINT `ck_inventarios_stock`;
ALTER TABLE `inventarios` ADD CONSTRAINT `ck_inventarios_stock_minimo`
  CHECK (`stock_minimo` >= 0);

ALTER TABLE `inventario_movimientos` DROP CONSTRAINT `ck_movimientos_cantidad`;
ALTER TABLE `inventario_movimientos` ADD CONSTRAINT `ck_movimientos_cantidad`
  CHECK (`cantidad` > 0);
