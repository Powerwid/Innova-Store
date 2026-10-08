import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PrismaService } from '../../database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { ReconocimientoService } from './reconocimiento.service.js';
import type { ReconocimientoClientService } from './reconocimiento-client.service.js';
import type { ReconocimientoStorageService } from './reconocimiento-storage.service.js';
import { ReconocerProductoSchema } from './dto/reconocimiento.dto.js';
import { reconocimientoConfig } from './reconocimiento.config.js';
import type { ReconocimientoConfig } from './reconocimiento.config.js';

const actor: UsuarioAutenticado = {
  idUsuario: 1,
  correo: 'test@example.invalid',
  estado: 'ACTIVO',
  rol: { idRol: 2, nombre: 'ADMIN' },
  permisos: [],
  sucursales: [7],
};
const file = {
  buffer: Buffer.from('test'),
  mimetype: 'image/png',
  size: 4,
} as Express.Multer.File;
const reference = {
  idReferencia: 11,
  idProducto: 2,
  archivo: 'photo.png',
  sha256: 'abc',
  mimeType: 'image/png',
  activo: true,
  estado: 'PENDIENTE',
  intentos: 0,
  modeloVersion: null,
  leaseToken: null,
  updatedAt: new Date('2026-10-01T00:00:00Z'),
};

function setup(config: Partial<ReconocimientoConfig> = {}) {
  const prisma = {
    sucursal: {
      findUnique: vi.fn().mockResolvedValue({ idSucursal: 7, activo: true }),
    },
    producto: {
      findUnique: vi.fn().mockResolvedValue({ idProducto: 2, estado: true }),
    },
    productoSucursal: {
      findFirst: vi.fn().mockResolvedValue({ idProductoSucursal: 20 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    referenciaVisual: {
      findUnique: vi.fn().mockResolvedValue(reference),
      findUniqueOrThrow: vi.fn().mockResolvedValue(reference),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(reference),
      update: vi.fn().mockResolvedValue(reference),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const client = {
    isConfigured: vi.fn().mockReturnValue(false),
    getHealth: vi.fn().mockResolvedValue({
      status: 'ok',
      modelVersion: 'model-v1',
      referenceCount: 5,
      modelLoaded: true,
    }),
    search: vi
      .fn()
      .mockResolvedValue({ modelVersion: 'model-v1', matches: [] }),
    indexReference: vi.fn().mockResolvedValue({
      idReferencia: 11,
      idProducto: 2,
      modelVersion: 'model-v1',
      dimension: 768,
    }),
    deleteReference: vi.fn().mockResolvedValue(undefined),
  };
  const storage = {
    validateImage: vi.fn(),
    read: vi.fn().mockResolvedValue(Buffer.from('test')),
    save: vi.fn().mockResolvedValue({
      archivo: 'photo.png',
      sha256: 'abc',
      mimeType: 'image/png',
    }),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const service = new ReconocimientoService(
    prisma as unknown as PrismaService,
    client as unknown as ReconocimientoClientService,
    storage as unknown as ReconocimientoStorageService,
    { ...reconocimientoConfig, ...config },
  );
  return { service, prisma, client, storage };
}

describe('Reconocimiento: catálogo y sucursal', () => {
  it('rechaza sucursales ajenas antes de consultar datos o el modelo', async () => {
    const { service, prisma, client } = setup();
    await expect(
      service.buscar(file, { idSucursal: 8, limite: 5 }, actor),
    ).rejects.toThrow('No tiene acceso');
    expect(prisma.sucursal.findUnique).not.toHaveBeenCalled();
    expect(client.getHealth).not.toHaveBeenCalled();
  });

  it('rechaza sucursales inactivas', async () => {
    const { service, prisma, client } = setup();
    prisma.sucursal.findUnique.mockResolvedValue({
      idSucursal: 7,
      activo: false,
    });
    await expect(
      service.buscar(file, { idSucursal: 7, limite: 5 }, actor),
    ).rejects.toThrow('inactiva');
    expect(client.search).not.toHaveBeenCalled();
  });

  it('exige imagen y valida DTO de multipart', async () => {
    const { service } = setup();
    await expect(
      service.buscar(undefined, { idSucursal: 7, limite: 5 }, actor),
    ).rejects.toThrow('campo file');
    expect(ReconocerProductoSchema.parse({ idSucursal: '7' })).toEqual({
      idSucursal: 7,
      limite: 5,
    });
    for (const dto of [
      { idSucursal: '0' },
      { idSucursal: '7', limite: '11' },
      { idSucursal: '7', autoAgregar: true },
    ]) {
      expect(ReconocerProductoSchema.safeParse(dto).success).toBe(false);
    }
  });

  it('ofrece selección manual si faltan fotos disponibles', async () => {
    const { service, client } = setup();
    expect(
      await service.buscar(file, { idSucursal: 7, limite: 5 }, actor),
    ).toMatchObject({
      estado: 'SIN_REFERENCIAS',
      candidatos: [],
      requiereConfirmacion: true,
    });
    expect(client.search).not.toHaveBeenCalled();
  });

  it('impide mezclar versiones de embeddings y detecta pérdida del índice', async () => {
    const { service, prisma, client } = setup();
    prisma.referenciaVisual.findMany.mockResolvedValue([
      { idReferencia: 11, idProducto: 2, modeloVersion: 'model-v0' },
    ] as never);
    await expect(
      service.buscar(file, { idSucursal: 7, limite: 5 }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    prisma.referenciaVisual.findMany.mockResolvedValue([
      { idReferencia: 11, idProducto: 2, modeloVersion: 'model-v1' },
    ] as never);
    client.getHealth.mockResolvedValue({
      status: 'ok',
      modelVersion: 'model-v1',
      referenceCount: 0,
      modelLoaded: true,
    });
    await expect(
      service.buscar(file, { idSucursal: 7, limite: 5 }, actor),
    ).rejects.toThrow('vacío');
  });

  it('agrupa fotos, descarta IDs ajenos/retirados y consulta precios vigentes de la sucursal', async () => {
    const { service, prisma, client } = setup();
    prisma.referenciaVisual.findMany
      .mockResolvedValueOnce([
        { idReferencia: 11, idProducto: 2, modeloVersion: 'model-v1' },
        { idReferencia: 12, idProducto: 2, modeloVersion: 'model-v1' },
        { idReferencia: 13, idProducto: 3, modeloVersion: 'model-v1' },
      ] as never)
      .mockResolvedValueOnce([
        { idReferencia: 11, idProducto: 2 },
        { idReferencia: 12, idProducto: 2 },
      ] as never);
    client.search.mockResolvedValue({
      modelVersion: 'model-v1',
      matches: [
        { idReferencia: 11, idProducto: 2, score: 0.81 },
        { idReferencia: 12, idProducto: 2, score: 0.91 },
        { idReferencia: 13, idProducto: 3, score: 0.98 },
        { idReferencia: 99, idProducto: 9, score: 0.99 },
        { idReferencia: 11, idProducto: 9, score: 1 },
      ],
    } as never);
    prisma.productoSucursal.findMany.mockResolvedValue([
      {
        idProducto: 2,
        idProductoSucursal: 20,
        precioCompra: '2.00',
        precioVenta: '3.50',
        producto: {
          nombre: 'Papa',
          imagen: 'catalog.jpg',
          unidadMedida: { simbolo: 'kg' },
          categoria: { nombre: 'Verduras' },
        },
      },
    ] as never);
    const result = await service.buscar(
      file,
      { idSucursal: 7, limite: 5 },
      actor,
    );
    expect(client.search).toHaveBeenCalledWith(file, [11, 12, 13], 50);
    expect(prisma.productoSucursal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idSucursal: 7,
          estado: true,
          idProducto: { in: [2] },
          producto: { estado: true },
        },
      }),
    );
    expect(result.candidatos).toEqual([
      expect.objectContaining({
        idProductoSucursal: 20,
        idReferencia: 12,
        similitud: 0.91,
        precioVenta: '3.50',
      }),
    ]);
    expect(result.requiereConfirmacion).toBe(true);
  });

  it('no selecciona un producto con similitud insuficiente', async () => {
    const { service, prisma, client } = setup();
    prisma.referenciaVisual.findMany.mockResolvedValue([
      { idReferencia: 11, idProducto: 2, modeloVersion: 'model-v1' },
    ] as never);
    client.search.mockResolvedValue({
      modelVersion: 'model-v1',
      matches: [{ idReferencia: 11, idProducto: 2, score: 0.3 }],
    } as never);
    const result = await service.buscar(
      file,
      { idSucursal: 7, limite: 5 },
      actor,
    );
    expect(result.estado).toBe('SIN_COINCIDENCIAS');
    expect(result.candidatos).toEqual([]);
  });

  it('impide que un administrador registre fotos de productos de otras sucursales', async () => {
    const { service, prisma, storage } = setup();
    prisma.productoSucursal.findFirst.mockResolvedValue(null);
    await expect(service.registrarReferencia(2, file, actor)).rejects.toThrow(
      'No tiene acceso',
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('deduplica el mismo producto/foto y retira el archivo redundante', async () => {
    const { service, prisma, storage } = setup();
    storage.save.mockResolvedValue({
      archivo: 'new.png',
      sha256: 'abc',
      mimeType: 'image/png',
    });
    const result = await service.registrarReferencia(2, file, actor);
    expect(prisma.referenciaVisual.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idProducto_sha256: { idProducto: 2, sha256: 'abc' } },
      }),
    );
    expect(storage.remove).toHaveBeenCalledWith('new.png');
    expect(result.idReferencia).toBe(11);
  });

  it('limpia foto recién guardada si falla el registro en MySQL', async () => {
    const { service, prisma, storage } = setup();
    prisma.referenciaVisual.upsert.mockRejectedValue(new Error('db down'));
    await expect(service.registrarReferencia(2, file, actor)).rejects.toThrow(
      'db down',
    );
    expect(storage.remove).toHaveBeenCalledWith('photo.png');
  });

  it('retira inmediatamente de las búsquedas e invalida una respuesta en curso', async () => {
    const { service, prisma } = setup();
    await service.retirarReferencia(11, actor);
    expect(prisma.referenciaVisual.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activo: false,
          estado: 'PENDIENTE',
          leaseToken: null,
          modeloVersion: null,
        }),
      }),
    );
  });

  it('reporta caída del servicio sin presentar disponibilidad falsa', async () => {
    const { service, client } = setup();
    client.isConfigured.mockReturnValue(true);
    client.getHealth.mockRejectedValue(new ServiceUnavailableException());
    expect(await service.estado(actor)).toMatchObject({
      configurado: true,
      disponible: false,
      servicio: null,
      umbralCalibrado: false,
    });
  });

  it('permite registrar fotos con el procesador automático desactivado', async () => {
    const { service, prisma, client } = setup({
      workerEnabled: false,
    });
    client.isConfigured.mockReturnValue(true);
    service.onModuleInit();
    await service.registrarReferencia(2, file, actor);
    expect(prisma.referenciaVisual.findMany).not.toHaveBeenCalled();
    expect(client.indexReference).not.toHaveBeenCalled();
    await service.onModuleDestroy();
  });

  it('informa foto ausente si falta el archivo del respaldo', async () => {
    const { service, storage } = setup();
    storage.read.mockRejectedValue(
      Object.assign(new Error('missing'), { code: 'ENOENT' }),
    );
    await expect(service.obtenerImagen(11, actor)).rejects.toThrow(
      'foto de referencia no está disponible',
    );
  });
});

describe('Reconocimiento: cola durable', () => {
  function queue() {
    const f = setup();
    f.client.isConfigured.mockReturnValue(true);
    f.prisma.referenciaVisual.findMany.mockResolvedValue([reference] as never);
    return f;
  }

  it('publica la referencia solo después de indexarla y usando token de reclamación', async () => {
    const { service, prisma, client } = queue();
    expect(await service.procesarPendientes()).toBe(1);
    expect(client.indexReference).toHaveBeenCalledWith(11, 2, {
      buffer: Buffer.from('test'),
      mimetype: 'image/png',
    });
    const claim = prisma.referenciaVisual.updateMany.mock
      .calls[0]![0] as unknown as {
      data: { leaseToken: string };
      where: { AND: unknown[] };
    };
    expect(claim.where.AND[0]).toMatchObject({
      idReferencia: 11,
      updatedAt: reference.updatedAt,
      activo: true,
      leaseToken: null,
    });
    expect(prisma.referenciaVisual.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { idReferencia: 11, leaseToken: claim.data.leaseToken },
        data: expect.objectContaining({
          estado: 'DISPONIBLE',
          modeloVersion: 'model-v1',
          dimension: 768,
        }),
      }),
    );
  });

  it('no procesa una referencia que otro worker reclamó o que fue modificada', async () => {
    const { service, prisma, client } = queue();
    prisma.referenciaVisual.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.procesarPendientes()).toBe(0);
    expect(client.indexReference).not.toHaveBeenCalled();
  });

  it('persiste error y próximo intento cuando Python está caído', async () => {
    const { service, prisma, client } = queue();
    client.indexReference.mockRejectedValue(
      new ServiceUnavailableException('Servicio caído'),
    );
    expect(await service.procesarPendientes()).toBe(0);
    expect(prisma.referenciaVisual.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ERROR',
          ultimoError: 'Servicio caído',
          proximoIntento: expect.any(Date),
          leaseToken: null,
        }),
      }),
    );
  });

  it('deja errores de imagen en espera de revisión sin reintentos infinitos', async () => {
    const { service, prisma, client } = queue();
    client.indexReference.mockRejectedValue(
      new BadRequestException('Imagen inválida'),
    );
    await service.procesarPendientes();
    expect(prisma.referenciaVisual.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ERROR',
          proximoIntento: null,
        }),
      }),
    );
  });

  it('elimina una referencia inactiva en FAISS antes de marcarla retirada', async () => {
    const { service, prisma, client, storage } = queue();
    prisma.referenciaVisual.findMany.mockResolvedValue([
      { ...reference, activo: false },
    ] as never);
    await service.procesarPendientes();
    expect(client.deleteReference).toHaveBeenCalledWith(11);
    expect(storage.read).not.toHaveBeenCalled();
    expect(prisma.referenciaVisual.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'RETIRADA' }),
      }),
    );
  });

  it('rechaza identidad incorrecta y evita publicar la referencia', async () => {
    const { service, prisma, client } = queue();
    client.indexReference.mockResolvedValue({
      idReferencia: 99,
      idProducto: 2,
      modelVersion: 'model-v1',
      dimension: 768,
    });
    await service.procesarPendientes();
    expect(prisma.referenciaVisual.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ERROR',
          proximoIntento: null,
        }),
      }),
    );
  });
});
