import { prisma } from './seeds/cliente-prisma.js';
import { seedEstados } from './seeds/base/estados.seed.js';
import { seedTiposDocumento } from './seeds/base/tipos-documento.seed.js';
import { seedRoles } from './seeds/usuarios/roles.seed.js';
import { seedPermisos } from './seeds/usuarios/permisos.seed.js';
import { seedSuperadmin } from './seeds/usuarios/superadmin.seed.js';
import { seedRolesPermisos } from './seeds/usuarios/roles-permisos.seed.js';

async function main() {
    console.log('\nIniciando seed de Innova-Store...\n');

    await seedEstados();
    await seedTiposDocumento();

    await seedRoles();
    await seedPermisos();
    await seedRolesPermisos();

    await seedSuperadmin();

    console.log('\nSeed finalizado correctamente.\n');
}

main()
    .catch((error) => {
        console.error('\nError ejecutando los seeders:\n');
        console.error(error);

        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
