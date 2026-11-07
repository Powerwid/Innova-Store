import { prisma } from './cliente-prisma.js';
import { seedClientesVarios } from './base/clientes.seed.js';

seedClientesVarios(prisma)
  .then(() => console.log('Clientes varios preparado.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
