import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { CONFIG_STOCK_NEGATIVO } from '../../../src/modules/logistica/logistica.constants.js';
export async function seedConfiguracionesGlobalesTest(prisma: PrismaClient) {
  await prisma.configuracionGlobal.upsert({
    where: { nombre: CONFIG_STOCK_NEGATIVO },
    create: { nombre: CONFIG_STOCK_NEGATIVO, activo: false },
    update: {},
  });
}
