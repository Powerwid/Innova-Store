import { CrearVentaSchema } from './ventas.dto.js';

import { describe, expect, it } from 'vitest';

const pago = (idMedioPago: number, monto: string) => ({
  idMedioPago,
  monto,
});

describe('Validación de ventas', () => {
  it('acepta contado o crédito identificado y valida productos de una venta', () => {
    const venta = {
      idCaja: 1,
      idSucursal: 2,
      monto: '100',
      productos: [
        {
          idProductoSucursal: 10,
          idAlmacen: 3,
          cantidad: '2.500',
          precioUnitario: '40.0000',
        },
      ],
      pagos: [pago(1, '40')],
      credito: { idCliente: 7, fechaVencimiento: '2026-10-31' },
    };

    expect(CrearVentaSchema.safeParse(venta).success).toBe(true);
    expect(
      CrearVentaSchema.safeParse({ ...venta, credito: undefined }).success,
    ).toBe(false);
    expect(
      CrearVentaSchema.safeParse({
        ...venta,
        productos: [...venta.productos, venta.productos[0]],
      }).success,
    ).toBe(false);
    expect(
      CrearVentaSchema.safeParse({
        ...venta,
        pagos: [pago(1, '100.01')],
      }).success,
    ).toBe(false);
    expect(
      CrearVentaSchema.safeParse({ ...venta, idMotivoIngreso: 1 }).success,
    ).toBe(false);
  });
});
