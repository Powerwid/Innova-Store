import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { TIPOS_MOVIMIENTO } from '../../../src/modules/logistica/logistica.constants.js';
export async function seedTiposMovimientoInventarioTest(prisma: PrismaClient) {
  for (const tipo of TIPOS_MOVIMIENTO)
    await prisma.tipoMovimientoInventario.upsert({
      where: { idTipoMovimiento: tipo.idTipoMovimiento },
      create: tipo,
      update: {},
    });
}
