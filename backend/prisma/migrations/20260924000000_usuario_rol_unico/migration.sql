-- Cada usuario conserva un unico rol. Durante la migracion se prioriza
-- SUPERADMIN y, para los demas casos, el rol con el menor identificador.
ALTER TABLE `usuarios` ADD COLUMN `id_rol` INTEGER NULL;

UPDATE `usuarios` AS `u`
SET `u`.`id_rol` = (
    SELECT `ur`.`id_rol`
    FROM `usuarios_roles` AS `ur`
    INNER JOIN `roles` AS `r` ON `r`.`id_rol` = `ur`.`id_rol`
    WHERE `ur`.`id_usuario` = `u`.`id_usuario`
    ORDER BY
        CASE WHEN `r`.`nombre` = 'SUPERADMIN' THEN 0 ELSE 1 END,
        `ur`.`id_rol` ASC
    LIMIT 1
);

-- Los usuarios antiguos sin rol reciben ADMIN para poder aplicar la
-- restriccion obligatoria. Los usuarios nuevos siempre deben indicar id_rol.
UPDATE `usuarios`
SET `id_rol` = (
    SELECT `id_rol`
    FROM `roles`
    WHERE `nombre` = 'ADMIN'
    LIMIT 1
)
WHERE `id_rol` IS NULL;

ALTER TABLE `usuarios`
    MODIFY `id_rol` INTEGER NOT NULL,
    ADD INDEX `usuarios_id_rol_idx` (`id_rol`),
    ADD CONSTRAINT `usuarios_id_rol_fkey`
        FOREIGN KEY (`id_rol`) REFERENCES `roles`(`id_rol`)
        ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE `usuarios_roles`;

ALTER TABLE `permisos`
    DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`;
