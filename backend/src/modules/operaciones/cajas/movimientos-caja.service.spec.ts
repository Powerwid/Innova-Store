import { describe, expect, it, vi } from 'vitest';
import { crearServiciosOperaciones } from '../../../../test/helpers/operaciones.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import type { PrismaService } from '../../../database/prisma/prisma.service.js';

const actor: UsuarioAutenticado = {
  idUsuario: 1,
  correo: 'operaciones@example.invalid',
  estado: 'ACTIVO',
  rol: { idRol: 1, nombre: 'ADMIN' },
  permisos: [],
  sucursales: [1],
};

describe('MovimientosCajaService - reglas reservadas', () => {
  it.each([1, 2])(
    'rechaza el motivo de ingreso interno %s en el endpoint genérico',
    (idMotivoIngreso) => {
      const transaction = vi.fn();
      const service = crearServiciosOperaciones({
        $transaction: transaction,
      } as unknown as PrismaService).movimientos;

      expect(() =>
        service.crearIngreso(
          {
            idCaja: 1,
            idSucursal: 1,
            idMotivoIngreso,
            monto: '10',
            pagos: [{ idMedioPago: 1, monto: '10' }],
          },
          actor,
        ),
      ).toThrow(
        'Este motivo solo puede generarse mediante su operación correspondiente',
      );
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it.each([1, 2, 3])(
    'rechaza el motivo de egreso interno %s en el endpoint genérico',
    (idMotivoEgreso) => {
      const transaction = vi.fn();
      const service = crearServiciosOperaciones({
        $transaction: transaction,
      } as unknown as PrismaService).movimientos;

      expect(() =>
        service.crearEgreso(
          {
            idCaja: 1,
            idSucursal: 1,
            idMotivoEgreso,
            monto: '10',
            pagos: [{ idMedioPago: 1, monto: '10' }],
          },
          actor,
        ),
      ).toThrow(
        'Este motivo solo puede generarse mediante su operación correspondiente',
      );
      expect(transaction).not.toHaveBeenCalled();
    },
  );
});
