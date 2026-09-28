import { describe, expect, it, vi } from 'vitest';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import type { PrismaService } from '../../database/prisma/prisma.service.js';
import { OperacionesService } from './operaciones.service.js';

const actor: UsuarioAutenticado = {
  idUsuario: 1,
  correo: 'operaciones@example.invalid',
  estado: 'ACTIVO',
  rol: { idRol: 1, nombre: 'ADMIN' },
  permisos: [],
  sucursales: [1],
};

describe('OperacionesService - reglas reservadas', () => {
  it.each([1, 2])(
    'rechaza el motivo de ingreso interno %s en el endpoint genérico',
    (idMotivoIngreso) => {
      const transaction = vi.fn();
      const service = new OperacionesService({
        $transaction: transaction,
      } as unknown as PrismaService);

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
      const service = new OperacionesService({
        $transaction: transaction,
      } as unknown as PrismaService);

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

describe('OperacionesService - totales de venta', () => {
  const ventaBase = {
    idCaja: 1,
    idSucursal: 1,
    monto: '10.00',
    pagos: [{ idMedioPago: 1, monto: '10.00' }],
    productos: [
      {
        idProductoSucursal: 1,
        idAlmacen: 1,
        cantidad: '2.000',
        precioUnitario: '5.0000',
      },
    ],
  };

  function servicioSinBase() {
    const transaction = vi.fn(
      async (work: (tx: Record<string, never>) => Promise<unknown>) => work({}),
    );
    return new OperacionesService({
      $transaction: transaction,
    } as unknown as PrismaService);
  }

  it('rechaza una cabecera que no coincide con las líneas', async () => {
    await expect(
      servicioSinBase().crearVenta({ ...ventaBase, monto: '9.99' }, actor),
    ).rejects.toThrow('El total de la venta debe coincidir con sus productos');
  });

  it('rechaza datos de crédito cuando la venta ya está pagada', async () => {
    await expect(
      servicioSinBase().crearVenta(
        {
          ...ventaBase,
          credito: { idCliente: 2 },
        },
        actor,
      ),
    ).rejects.toThrow(
      'No debe indicar crédito cuando la venta está totalmente pagada',
    );
  });
});
