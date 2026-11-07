import {
  ActualizarMotivoEgresoSchema,
  ActualizarMotivoIngresoSchema,
  ActualizarTipoComprobanteSchema,
  MotivoEgresoSchema,
  MotivoIngresoSchema,
  TipoComprobanteSchema,
} from './catalogos.dto.js';

import { describe, expect, it } from 'vitest';

describe('Validación de catalogos', () => {
  it('crea y actualiza catálogos con cuerpos estrictos', () => {
    expect(MotivoIngresoSchema.parse({ motivo: 'Venta' })).toEqual({
      motivo: 'Venta',
      activo: true,
    });
    expect(
      MotivoEgresoSchema.parse({ motivo: 'Compra', activo: false }),
    ).toEqual({ motivo: 'Compra', activo: false });
    expect(ActualizarMotivoIngresoSchema.safeParse({}).success).toBe(false);
    expect(ActualizarMotivoEgresoSchema.parse({ activo: false })).toEqual({
      activo: false,
    });
    expect(
      TipoComprobanteSchema.parse({ nombre: 'Factura', codigoSunat: '01' }),
    ).toEqual({ nombre: 'Factura', codigoSunat: '01' });
    expect(
      TipoComprobanteSchema.safeParse({ nombre: 'Factura', codigoSunat: '1' })
        .success,
    ).toBe(false);
    expect(
      ActualizarTipoComprobanteSchema.parse({ codigoSunat: null }),
    ).toEqual({ codigoSunat: null });
    expect(ActualizarTipoComprobanteSchema.safeParse({}).success).toBe(false);
  });
});
