import { describe, expect, it } from 'vitest';
import { calcularResumenCaja } from './caja-resumen.js';

const pago = (monto: string, idMedioPago = 1) => ({
  idMedioPago,
  monto,
  medioPago: { nombre: idMedioPago === 1 ? 'Efectivo' : 'Tarjeta' },
});
describe('Resumen histórico de caja', () => {
  it('separa crédito, abonos, pagos de compras y percepciones sin duplicar dinero', () => {
    const result = calcularResumenCaja(
      { montoApertura: '200', detalles: [pago('230'), pago('10', 2)] },
      [
        {
          idMotivoIngreso: 1,
          monto: '100',
          pagos: [pago('40'), pago('10', 2)],
        },
        { idMotivoIngreso: 4, monto: '20', pagos: [pago('20')] },
        { idMotivoIngreso: 2, monto: '15', pagos: [pago('15')] },
      ],
      [
        { idMotivoEgreso: 3, idCompra: null, pagos: [] },
        { idMotivoEgreso: 4, idCompra: null, pagos: [pago('10')] },
        { idMotivoEgreso: 1, idCompra: 12, pagos: [pago('30')] },
        { idMotivoEgreso: 2, idCompra: 12, pagos: [pago('5')] },
      ],
    );
    expect(result).toMatchObject({
      totalVentas: '100.00',
      cobrosVentas: '50.00',
      creditoOriginado: '50.00',
      ingresos: '35.00',
      egresos: '10.00',
      compras: '35.00',
      saldoCalculado: '240.00',
      efectivoEsperado: '230.00',
      diferencia: '0.00',
      cantidades: { ventas: 1, ingresos: 2, egresos: 1, compras: 1 },
    });
    expect(result.mediosPago[0]).toMatchObject({
      nombre: 'Efectivo',
      neto: '30.00',
      saldo: '230.00',
    });
  });
  it('incluye más de cien ventas y suma decimales sin errores de punto flotante', () => {
    const result = calcularResumenCaja(
      { montoApertura: '200', detalles: [pago('212.50')] },
      Array.from({ length: 125 }, () => ({
        idMotivoIngreso: 1,
        monto: '0.10',
        pagos: [pago('0.10')],
      })),
      [],
    );
    expect(result.cobrosVentas).toBe('12.50');
    expect(result.saldoCalculado).toBe('212.50');
    expect(result.cantidades.ventas).toBe(125);
  });
  it('una venta totalmente a crédito no aumenta el saldo', () => {
    const result = calcularResumenCaja(
      { montoApertura: '20', detalles: [pago('20')] },
      [{ idMotivoIngreso: 1, monto: '50', pagos: [] }],
      [{ idMotivoEgreso: 3, idCompra: null, pagos: [] }],
    );
    expect(result.saldoCalculado).toBe('20.00');
    expect(result.creditoOriginado).toBe('50.00');
  });
});
