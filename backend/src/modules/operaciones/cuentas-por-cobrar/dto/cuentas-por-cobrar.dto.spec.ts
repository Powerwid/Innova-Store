import { describe, expect, it } from 'vitest';
import { CrearAbonoDeudaSchema } from './cuentas-por-cobrar.dto.js';
const pago = (idMedioPago: number, monto: string) => ({ idMedioPago, monto });
describe('Validación de cuentas por cobrar', () => {
  it('valida abonos sin motivos expuestos', () => {
    const abono = {
      idCaja: 1,
      idSucursal: 2,
      monto: '50',
      pagos: [pago(1, '50')],
    };
    expect(CrearAbonoDeudaSchema.safeParse(abono).success).toBe(true);
    expect(
      CrearAbonoDeudaSchema.safeParse({ ...abono, idMotivoIngreso: 2 }).success,
    ).toBe(false);
  });
});
