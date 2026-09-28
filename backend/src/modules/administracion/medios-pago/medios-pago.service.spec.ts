import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../database/prisma/prisma.service.js';
import { MediosPagoService } from './medios-pago.service.js';

describe('MediosPagoService - opción Fraccionado', () => {
  it('impide renombrar la opción reservada', async () => {
    const update = vi.fn();
    const service = new MediosPagoService({
      medioPago: {
        findUnique: vi.fn().mockResolvedValue({
          idMedioPago: 5,
          nombre: 'Fraccionado',
        }),
        update,
      },
    } as unknown as PrismaService);

    await expect(
      service.actualizar(5, { nombre: 'Crédito interno' }),
    ).rejects.toThrow(
      'Fraccionado es una opción reservada y no puede modificarse',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('impide eliminar la opción reservada', async () => {
    const eliminar = vi.fn();
    const service = new MediosPagoService({
      medioPago: {
        findUnique: vi.fn().mockResolvedValue({
          idMedioPago: 5,
          nombre: 'Fraccionado',
        }),
        delete: eliminar,
      },
    } as unknown as PrismaService);

    await expect(service.eliminar(5)).rejects.toThrow(
      'Fraccionado es una opción reservada y no puede eliminarse',
    );
    expect(eliminar).not.toHaveBeenCalled();
  });
});
