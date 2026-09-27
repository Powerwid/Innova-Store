import { prisma } from '../cliente-prisma.js';
import {
  CONFIG_STOCK_NEGATIVO,
  TIPOS_MOVIMIENTO,
} from '../../../src/modules/logistica/logistica.constants.js';

export async function seedLogistica() {
  await prisma.configuracionGlobal.upsert({
    where: { nombre: CONFIG_STOCK_NEGATIVO },
    create: { nombre: CONFIG_STOCK_NEGATIVO, activo: false },
    update: {},
  });
  for (const tipo of TIPOS_MOVIMIENTO) {
    await prisma.tipoMovimientoInventario.upsert({
      where: { idTipoMovimiento: tipo.idTipoMovimiento },
      create: tipo,
      update: tipo,
    });
  }
}
