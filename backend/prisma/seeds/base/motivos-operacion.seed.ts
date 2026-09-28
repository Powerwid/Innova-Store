import { prisma } from '../cliente-prisma.js';

const motivosIngreso = [
  { idMotivoIngreso: 1, motivo: 'Venta', activo: true },
  { idMotivoIngreso: 2, motivo: 'Abono de deuda', activo: true },
  { idMotivoIngreso: 3, motivo: 'Otro ingreso', activo: true },
] as const;

const motivosEgreso = [
  { idMotivoEgreso: 1, motivo: 'Compra', activo: true },
  { idMotivoEgreso: 2, motivo: 'Percepción', activo: true },
  { idMotivoEgreso: 3, motivo: 'Crédito a cliente', activo: true },
  { idMotivoEgreso: 4, motivo: 'Otro egreso', activo: true },
] as const;

const motivosIngresoBasicos = [
  'Aporte de capital',
  'Cobro de servicio',
  'Devolución de proveedor',
  'Ajuste positivo de caja',
] as const;

const motivosEgresoBasicos = [
  'Gastos operativos',
  'Servicios básicos',
  'Movilidad',
  'Devolución a cliente',
  'Ajuste negativo de caja',
] as const;

export async function seedMotivosOperacion() {
  await prisma.$transaction(async (tx) => {
    for (const motivo of motivosIngreso) {
      await tx.motivoIngreso.upsert({
        where: { idMotivoIngreso: motivo.idMotivoIngreso },
        create: motivo,
        update: { motivo: motivo.motivo, activo: motivo.activo },
      });
    }

    for (const motivo of motivosEgreso) {
      await tx.motivoEgreso.upsert({
        where: { idMotivoEgreso: motivo.idMotivoEgreso },
        create: motivo,
        update: { motivo: motivo.motivo, activo: motivo.activo },
      });
    }

    for (const motivo of motivosIngresoBasicos) {
      await tx.motivoIngreso.upsert({
        where: { motivo },
        create: { motivo, activo: true },
        update: {},
      });
    }

    for (const motivo of motivosEgresoBasicos) {
      await tx.motivoEgreso.upsert({
        where: { motivo },
        create: { motivo, activo: true },
        update: {},
      });
    }
  });

  console.log('Motivos de ingreso y egreso preparados');
}
