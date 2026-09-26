import { prisma } from '../cliente-prisma.js';

const mediosPago = [
  'Efectivo',
  'Tarjeta de crédito/débito',
  'Yape',
  'Plin',
  'Fraccionado',
] as const;

export async function seedMediosPago() {
  for (const nombre of mediosPago) {
    await prisma.medioPago.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log('Medios de pago preparados');
}
