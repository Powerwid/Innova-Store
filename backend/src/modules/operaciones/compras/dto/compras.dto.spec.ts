import {
  CrearCompraSchema,
  CrearPercepcionSchema,
  PagoCompraSchema,
} from './compras.dto.js';

import { describe, expect, it } from 'vitest';

const pago = (idMedioPago: number, monto: string) => ({
  idMedioPago,
  monto,
});

describe('Validación de compras', () => {
  it('acepta una compra pendiente, parcial o con percepción y comprobante', () => {
    const compra = {
      idCaja: 1,
      idSucursal: 2,
      idAlmacen: 4,
      idProveedor: 8,
      nombreProveedor: 'Distribuidora del Sur SAC',
      fechaCompra: '2026-09-28T11:00:00-05:00',
      subtotal: '80',
      igv: '20',
      total: '100',
      detalles: [
        {
          idProductoSucursal: 10,
          cantidad: '2.500',
          precioUnitario: '40',
        },
      ],
      comprobante: {
        idTipoComprobante: 1,
        serie: 'F001',
        numero: '1234',
        fechaEmision: '2026-09-28',
      },
      pagos: [pago(1, '40')],
      percepcion: {
        fechaPercepcion: '2026-09-28',
        baseCalculo: '100',
        porcentaje: '2',
        monto: '2',
        numeroConstancia: 'P-123',
        pagos: [pago(1, '2')],
      },
    };

    expect(CrearCompraSchema.safeParse(compra).success).toBe(true);
    expect(
      CrearCompraSchema.safeParse({ ...compra, pagos: [], percepcion: null })
        .success,
    ).toBe(true);
    expect(
      CrearCompraSchema.safeParse({ ...compra, total: '99.99' }).success,
    ).toBe(false);
    expect(
      CrearCompraSchema.safeParse({
        ...compra,
        detalles: [...compra.detalles, compra.detalles[0]],
      }).success,
    ).toBe(false);
    expect(
      CrearCompraSchema.safeParse({ ...compra, idMotivoEgreso: 1 }).success,
    ).toBe(false);
  });

  it('valida pagos posteriores y percepciones sin motivos expuestos', () => {
    const pagoCompra = {
      idCaja: 1,
      idSucursal: 2,
      pagos: [pago(1, '30'), pago(2, '20')],
    };
    expect(PagoCompraSchema.safeParse(pagoCompra).success).toBe(true);
    expect(
      PagoCompraSchema.safeParse({ ...pagoCompra, monto: '50' }).success,
    ).toBe(true);
    expect(
      PagoCompraSchema.safeParse({ ...pagoCompra, monto: '49.99' }).success,
    ).toBe(false);

    expect(
      CrearPercepcionSchema.safeParse({
        idCaja: 1,
        idSucursal: 2,
        fechaPercepcion: '2026-09-28',
        baseCalculo: '100',
        porcentaje: '2',
        monto: '2',
        pagos: [pago(1, '2')],
      }).success,
    ).toBe(true);
  });
});
