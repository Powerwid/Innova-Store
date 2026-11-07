import {
  CantidadSchema,
  DineroSchema,
  FechaHoraSchema,
  FechaSchema,
  ListarOperacionesSchema,
  PorcentajeSchema,
  PrecioUnitarioSchema,
} from './operaciones-base.dto.js';

import { describe, expect, it } from 'vitest';

describe('Validación de compartido', () => {
  it('acepta el filtro por caja de ventas y rechaza identificadores inválidos', () => {
    expect(ListarOperacionesSchema.parse({ idCaja: '2' }).idCaja).toBe(2);
    expect(ListarOperacionesSchema.safeParse({ idCaja: '-1' }).success).toBe(
      false,
    );
  });

  it('respeta exactamente la precisión de cada decimal', () => {
    expect(DineroSchema.parse('999999999999.99')).toBe('999999999999.99');
    expect(PrecioUnitarioSchema.parse('9999999999.9999')).toBe(
      '9999999999.9999',
    );
    expect(CantidadSchema.parse('99999999999.999')).toBe('99999999999.999');
    expect(PorcentajeSchema.parse('100.000')).toBe('100.000');

    for (const value of [
      '-1',
      '1000000000000.00',
      '1.001',
      '1,50',
      'Infinity',
      true,
      null,
    ]) {
      expect(DineroSchema.safeParse(value).success).toBe(false);
    }
    expect(PrecioUnitarioSchema.safeParse('1.00001').success).toBe(false);
    expect(CantidadSchema.safeParse('1.0001').success).toBe(false);
    expect(PorcentajeSchema.safeParse('100.001').success).toBe(false);
  });

  it('exige fechas DATE o fecha-hora ISO con zona según corresponda', () => {
    expect(FechaSchema.safeParse('2026-02-28').success).toBe(true);
    expect(FechaSchema.safeParse('2026-02-30').success).toBe(false);
    expect(FechaHoraSchema.safeParse('2026-09-28T11:00:00-05:00').success).toBe(
      true,
    );
    expect(FechaHoraSchema.safeParse('2026-09-28T11:00:00').success).toBe(
      false,
    );
    expect(FechaSchema.safeParse('28/09/2026').success).toBe(false);
  });
});
