import type { PrismaClient } from '../../../src/generated/prisma/client.js';

export async function seedClientesVarios(db: PrismaClient) {
  const tipo = await db.tipoDocumento.upsert({
    where: { nombre: 'SIN DOCUMENTO' },
    update: {},
    create: { nombre: 'SIN DOCUMENTO', activo: true },
  });
  return db.cliente.upsert({
    where: {
      idTipoDocumento_numeroDocumento: {
        idTipoDocumento: tipo.idTipoDocumento,
        numeroDocumento: 'VARIOS',
      },
    },
    update: { esGenerico: true, activo: true },
    create: {
      nombre: 'Clientes varios',
      numeroDocumento: 'VARIOS',
      idTipoDocumento: tipo.idTipoDocumento,
      esGenerico: true,
    },
  });
}
