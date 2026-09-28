import { describe, expect, it, vi } from 'vitest';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import type { PrismaService } from '../../database/prisma/prisma.service.js';
import { ActualizarAlmacenSchema, AlmacenSchema } from './dto/logistica.dto.js';
import { LogisticaService } from './logistica.service.js';

const actor: UsuarioAutenticado = {
  idUsuario: 1,
  correo: 'prueba@example.invalid',
  estado: 'ACTIVO',
  rol: { idRol: 1, nombre: 'ADMIN' },
  permisos: [],
  sucursales: [7],
};

describe('LogisticaService - almacenes', () => {
  it('persiste el tipo al crear un almacén', async () => {
    const create = vi.fn().mockResolvedValue({ idAlmacen: 11 });
    const prisma = {
      sucursal: {
        findUnique: vi.fn().mockResolvedValue({ idSucursal: 7, activo: true }),
      },
      almacen: { create },
    };
    const service = new LogisticaService(prisma as unknown as PrismaService);
    const dto = AlmacenSchema.parse({
      idSucursal: 7,
      nombre: 'Mostrador',
      tipo: 'AREA_VENTA',
    });

    await service.crearAlmacen(dto, actor);

    expect(create).toHaveBeenCalledWith({ data: dto });
    expect(create.mock.calls[0]?.[0].data.tipo).toBe('AREA_VENTA');
  });

  it('persiste solo el tipo enviado al actualizar un almacén', async () => {
    const update = vi.fn().mockResolvedValue({
      idAlmacen: 11,
      idSucursal: 7,
      tipo: 'AREA_VENTA',
    });
    const prisma = {
      sucursal: {
        findUnique: vi.fn().mockResolvedValue({ idSucursal: 7, activo: true }),
      },
      almacen: {
        findUnique: vi.fn().mockResolvedValue({
          idAlmacen: 11,
          idSucursal: 7,
          tipo: 'ALMACEN',
        }),
        update,
      },
    };
    const service = new LogisticaService(prisma as unknown as PrismaService);
    const dto = ActualizarAlmacenSchema.parse({ tipo: 'AREA_VENTA' });

    await service.actualizarAlmacen(11, dto, actor);

    expect(update).toHaveBeenCalledWith({
      where: { idAlmacen: 11 },
      data: { tipo: 'AREA_VENTA' },
    });
  });

  it.each([5, 6])(
    'impide crear manualmente el movimiento interno %s',
    (idTipoMovimiento) => {
      const transaction = vi.fn();
      const service = new LogisticaService({
        $transaction: transaction,
      } as unknown as PrismaService);

      expect(() =>
        service.crearMovimiento(
          {
            idInventario: 1,
            idTipoMovimiento,
            cantidad: '1',
          },
          actor,
        ),
      ).toThrow(
        'Los movimientos de compra y venta solo se generan desde su operación correspondiente',
      );
      expect(transaction).not.toHaveBeenCalled();
    },
  );
});
