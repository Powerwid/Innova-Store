import { describe, expect, it } from 'vitest';
import {
  normalizarDetalleCompra,
  totalCompraCentavos,
  totalPagosCentavos,
} from '../../../frontend/src/modules/operaciones/compra-importes';
import { CrearCompraSchema } from '../../src/modules/operaciones/compras/dto/compras.dto.js';

describe('Compatibilidad de importes frontend/backend', () => {
  const detalles = [
    { cantidad: '37', precioUnitario: '3' },
    { cantidad: '13', precioUnitario: '1.5' },
    { cantidad: '31', precioUnitario: '1' },
  ];
  it('acepta el pago completo de S/ 161.50 de la captura', () => {
    expect(totalCompraCentavos(detalles)).toBe(16150n);
    expect(totalPagosCentavos([{ monto: '161.50' }])).toBe(16150n);
    expect(
      CrearCompraSchema.safeParse({
        idCaja: 1,
        idSucursal: 1,
        idAlmacen: 1,
        nombreProveedor: 'Prueba',
        total: (Number(totalCompraCentavos(detalles)) / 100).toFixed(2),
        detalles: detalles.map((d, i) => ({
          idProductoSucursal: i + 1,
          ...normalizarDetalleCompra(d),
        })),
        pagos: [{ idMedioPago: 1, monto: '161.50' }],
      }).success,
    ).toBe(true);
  });
});
