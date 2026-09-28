import { prisma } from './cliente-prisma.js';
import { seedMotivosOperacion } from './base/motivos-operacion.seed.js';

seedMotivosOperacion()
  .catch((error) => {
    console.error('Error ejecutando el seeder de motivos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
