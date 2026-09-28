import { prisma } from '../cliente-prisma.js';

const tiposComprobante = [
  { idTipoComprobante: 1, nombre: 'Factura', codigoSunat: '01' },
  { idTipoComprobante: 2, nombre: 'Boleta de venta', codigoSunat: '03' },
  { idTipoComprobante: 3, nombre: 'Nota de crédito', codigoSunat: '07' },
  { idTipoComprobante: 4, nombre: 'Nota de débito', codigoSunat: '08' },
  { idTipoComprobante: 5, nombre: 'Ticket', codigoSunat: '12' },
  { idTipoComprobante: 6, nombre: 'Nota de pedido', codigoSunat: null },
] as const;

export async function seedTiposComprobante() {
  for (const tipo of tiposComprobante) {
    await prisma.tipoComprobante.upsert({
      where: { idTipoComprobante: tipo.idTipoComprobante },
      create: tipo,
      update: { nombre: tipo.nombre, codigoSunat: tipo.codigoSunat },
    });
  }

  console.log('Tipos de comprobante preparados');
}
