import { ListarTiposComprobanteSchema } from '../../catalogos/dto/catalogos.dto.js';
import {
  ListarOperacionesSchema,
  PagosSchema,
} from '../../compartido/dto/operaciones-base.dto.js';
import {
  AbrirCajaSchema,
  CajaAbiertaQuerySchema,
  CerrarCajaSchema,
  ListarCajasSchema,
} from './cajas.dto.js';

import { describe, expect, it } from 'vitest';

const pago = (idMedioPago: number, monto: string) => ({
  idMedioPago,
  monto,
});

describe('Validación de cajas', () => {
  it('pagina, convierte filtros y rechaza rangos invertidos o campos ajenos', () => {
    expect(
      ListarCajasSchema.parse({
        pagina: '2',
        limite: '25',
        idSucursal: '8',
        abierta: 'false',
      }),
    ).toMatchObject({
      pagina: 2,
      limite: 25,
      idSucursal: 8,
      abierta: false,
    });

    expect(
      ListarOperacionesSchema.safeParse({
        desde: '2026-09-29T00:00:00-05:00',
        hasta: '2026-09-28T23:59:59-05:00',
      }).success,
    ).toBe(false);
    expect(
      ListarOperacionesSchema.safeParse({ campoDesconocido: true }).success,
    ).toBe(false);
    expect(CajaAbiertaQuerySchema.parse({ idSucursal: '8' })).toEqual({
      idSucursal: 8,
    });
    expect(CajaAbiertaQuerySchema.safeParse({}).success).toBe(false);
    expect(
      ListarTiposComprobanteSchema.safeParse({ activo: 'true' }).success,
    ).toBe(false);
  });

  it('valida la apertura con un único monto físico y el cierre de caja', () => {
    expect(
      AbrirCajaSchema.parse({
        idSucursal: 1,
        montoApertura: '0.30',
      }).montoApertura,
    ).toBe('0.30');
    expect(
      AbrirCajaSchema.safeParse({
        idSucursal: 1,
        montoApertura: '10',
        detalles: [pago(1, '10')],
      }).success,
    ).toBe(false);
    expect(PagosSchema.safeParse([pago(1, '5'), pago(1, '5')]).success).toBe(
      false,
    );
    expect(CerrarCajaSchema.safeParse({ montoCierre: '0' }).success).toBe(true);
    expect(
      CerrarCajaSchema.safeParse({ montoCierre: '0', comentario: 'extra' })
        .success,
    ).toBe(false);
  });
});
