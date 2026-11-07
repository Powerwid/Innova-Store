import {
  CrearEgresoSchema,
  CrearIngresoSchema,
} from './movimientos-caja.dto.js';

import { describe, expect, it } from 'vitest';

const pago = (idMedioPago: number, monto: string) => ({
  idMedioPago,
  monto,
});

describe('Validación de cajas', () => {
  it('exige que los pagos cubran exactamente ingresos y egresos genéricos', () => {
    const base = {
      idCaja: 1,
      idSucursal: 1,
      monto: '25.50',
      detalle: 'Movimiento manual',
      pagos: [pago(1, '20'), pago(2, '5.50')],
    };

    expect(
      CrearIngresoSchema.safeParse({ ...base, idMotivoIngreso: 3 }).success,
    ).toBe(true);
    expect(
      CrearEgresoSchema.safeParse({ ...base, idMotivoEgreso: 4 }).success,
    ).toBe(true);
    expect(
      CrearIngresoSchema.safeParse({
        ...base,
        idMotivoIngreso: 3,
        pagos: [pago(1, '25.49')],
      }).success,
    ).toBe(false);
  });
});
