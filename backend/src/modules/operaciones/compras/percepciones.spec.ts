import { ListarPercepcionesSchema } from './dto/compras.dto.js';

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { crearServiciosOperaciones } from '../../../../test/helpers/operaciones.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import type { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

const actor: UsuarioAutenticado = {
  idUsuario: 1,
  correo: 'lector@example.test',
  estado: 'ACTIVO',
  rol: { idRol: 2, nombre: 'LECTOR' },
  permisos: ['COMPRAS_VER'],
  sucursales: [1, 2],
};

function preparar() {
  const db = {
    compraPercepcion: {
      findMany: vi.fn(async (_args: Prisma.CompraPercepcionFindManyArgs) => [
        { idPercepcion: 3, idCompra: 7, monto: '0.06' },
      ]),
      aggregate: vi.fn(async (_args: Prisma.CompraPercepcionAggregateArgs) => ({
        _sum: { monto: new Prisma.Decimal('25.16') as Prisma.Decimal | null },
        _count: { _all: 3 },
      })),
    },
    compra: { count: vi.fn(async (_args: Prisma.CompraCountArgs) => 2) },
  };
  const prisma = {
    $transaction: vi.fn(
      async (callback: (tx: typeof db) => unknown, _options: unknown) =>
        callback(db),
    ),
  };
  return {
    db,
    prisma,
    service: crearServiciosOperaciones(prisma as unknown as PrismaService)
      .percepciones,
  };
}

describe('Historial de percepciones', () => {
  it('calcula el total de todo el filtro y cuenta compras únicas, aunque solo se muestre un registro', async () => {
    const { service, db, prisma } = preparar();
    const q = ListarPercepcionesSchema.parse({
      idSucursal: '1',
      pagina: '2',
      limite: '1',
      desde: '2026-10-01',
      hasta: '2026-10-10',
    });
    const result = await service.listarPercepciones(q, actor);
    expect(result).toMatchObject({
      pagina: 2,
      limite: 1,
      total: 3,
      resumen: { montoTotal: '25.16', numeroPercepciones: 3, numeroCompras: 2 },
    });
    expect(result.data).toHaveLength(1);
    const consulta = db.compraPercepcion.findMany.mock.calls[0][0];
    expect(consulta).toMatchObject({ skip: 1, take: 1 });
    expect(db.compraPercepcion.aggregate).toHaveBeenCalledWith({
      where: consulta.where,
      _sum: { monto: true },
      _count: { _all: true },
    });
    expect(db.compra.count).toHaveBeenCalledWith({
      where: { percepciones: { some: consulta.where } },
    });
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  });

  it('filtra la fecha de percepción por días inclusivos y aplica proveedor, compra y sucursal a la suma', async () => {
    const { service, db } = preparar();
    await service.listarPercepciones(
      ListarPercepcionesSchema.parse({
        idSucursal: '2',
        idProveedor: '8',
        idCompra: '7',
        desde: '2026-10-10',
        hasta: '2026-10-10',
        buscar: ' P001 ',
      }),
      actor,
    );
    const where = db.compraPercepcion.findMany.mock.calls[0][0].where!;
    expect(where).toMatchObject({
      idCompra: 7,
      compra: { idSucursal: 2, idProveedor: 8 },
      fechaPercepcion: {
        gte: new Date('2026-10-10T00:00:00Z'),
        lte: new Date('2026-10-10T00:00:00Z'),
      },
    });
    expect(where.OR).toContainEqual({ numeroConstancia: { contains: 'P001' } });
    expect(where.OR).toContainEqual({
      compra: { nombreProveedor: { contains: 'P001' } },
    });
    expect(db.compraPercepcion.aggregate.mock.calls[0][0].where).toEqual(where);
  });

  it('rechaza una sucursal ajena antes de leer registros o totales', async () => {
    const { service, prisma } = preparar();
    await expect(
      service.listarPercepciones(
        ListarPercepcionesSchema.parse({ idSucursal: '99' }),
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('permite consulta de lectura sin caja y limita todo el historial a las sucursales asignadas', async () => {
    const { service, db } = preparar();
    await service.listarPercepciones(ListarPercepcionesSchema.parse({}), actor);
    expect(db.compraPercepcion.findMany.mock.calls[0][0].where).toMatchObject({
      compra: { idSucursal: { in: [1, 2] } },
      fechaPercepcion: { gte: undefined, lte: undefined },
    });
  });

  it('devuelve un resumen de cero cuando no hay percepciones', async () => {
    const { service, db } = preparar();
    db.compraPercepcion.findMany.mockResolvedValue([]);
    db.compraPercepcion.aggregate.mockResolvedValue({
      _sum: { monto: null },
      _count: { _all: 0 },
    });
    db.compra.count.mockResolvedValue(0);
    expect(
      await service.listarPercepciones(
        ListarPercepcionesSchema.parse({}),
        actor,
      ),
    ).toMatchObject({
      data: [],
      total: 0,
      resumen: { montoTotal: '0.00', numeroPercepciones: 0, numeroCompras: 0 },
    });
  });

  it('rechaza periodos invertidos, fechas inválidas y parámetros ajenos al historial', () => {
    for (const query of [
      { desde: '2026-10-11', hasta: '2026-10-10' },
      { desde: '2026-02-30' },
      { hasta: '2026-10-10T05:00:00Z' },
      { idSucursal: '0' },
      { limite: '101' },
      { idCaja: '1' },
    ])
      expect(ListarPercepcionesSchema.safeParse(query).success).toBe(false);
  });
});

describe('Control de registros repetidos de percepción', () => {
  function prepararRegistro(
    bases: string[],
    documentos: Array<string | null> = [],
  ) {
    const db = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      compra: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            idCompra: 7,
            idSucursal: 1,
            total: new Prisma.Decimal('3.00'),
          }),
      },
      sucursal: {
        findUnique: vi.fn().mockResolvedValue({ idSucursal: 1, activo: true }),
      },
      compraPercepcion: {
        findMany: vi
          .fn()
          .mockResolvedValue(
            bases.map((base, i) => ({
              baseCalculo: new Prisma.Decimal(base),
              numeroConstancia: documentos[i] ?? null,
            })),
          ),
        create: vi.fn(),
      },
      egreso: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (tx: typeof db) => unknown) =>
        callback(db),
      ),
    };
    return {
      db,
      service: crearServiciosOperaciones(prisma as unknown as PrismaService)
        .compras,
    };
  }
  const dto = {
    idCaja: 1,
    idSucursal: 1,
    fechaPercepcion: '2026-10-10',
    baseCalculo: '3.00',
    porcentaje: '2.000',
    monto: '0.06',
    pagos: [{ idMedioPago: 1, monto: '0.06' }],
  };

  it('rechaza la percepción completa repetida antes de crear otro egreso', async () => {
    const { service, db } = prepararRegistro(['3.00']);
    await expect(
      service.registrarPercepcionCompra(7, dto, actor),
    ).rejects.toThrow('percepción sobre todo su importe');
    expect(db.egreso.create).not.toHaveBeenCalled();
    expect(db.compraPercepcion.create).not.toHaveBeenCalled();
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('rechaza una base parcial que exceda el importe restante, aunque el monto redondeado sea igual', async () => {
    const { service, db } = prepararRegistro(['1.50']);
    const parcial = {
      ...dto,
      baseCalculo: '1.51',
      monto: '0.03',
      pagos: [{ idMedioPago: 1, monto: '0.03' }],
    };
    await expect(
      service.registrarPercepcionCompra(7, parcial, actor),
    ).rejects.toThrow('S/ 1.50');
    expect(db.egreso.create).not.toHaveBeenCalled();
  });

  it('rechaza el mismo documento de percepción sin distinguir espacios exteriores ni mayúsculas', async () => {
    const { service, db } = prepararRegistro(['1.00'], ['P-123']);
    await expect(
      service.registrarPercepcionCompra(
        7,
        {
          ...dto,
          baseCalculo: '1.00',
          monto: '0.02',
          numeroConstancia: ' p-123 ',
          pagos: [{ idMedioPago: 1, monto: '0.02' }],
        },
        actor,
      ),
    ).rejects.toThrow('comprobante de percepción ya está registrado');
    expect(db.egreso.create).not.toHaveBeenCalled();
  });

  it('bloquea registros adicionales si los datos anteriores ya exceden la compra', async () => {
    const { service } = prepararRegistro(['3.00', '3.00']);
    await expect(
      service.registrarPercepcionCompra(7, dto, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza una primera percepción con una base superior al total de la compra', async () => {
    const { service } = prepararRegistro([]);
    await expect(
      service.registrarPercepcionCompra(
        7,
        {
          ...dto,
          baseCalculo: '4.00',
          monto: '0.08',
          pagos: [{ idMedioPago: 1, monto: '0.08' }],
        },
        actor,
      ),
    ).rejects.toThrow('S/ 3.00');
  });
});
