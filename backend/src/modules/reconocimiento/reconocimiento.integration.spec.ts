import 'reflect-metadata';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { PermisosGuard } from '../../common/guards/permisos.guard.js';
import { SuperadminGuard } from '../../common/guards/superadmin.guard.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { ReconocimientoController } from './reconocimiento.controller.js';
import { ReconocimientoService } from './reconocimiento.service.js';
import { ReconocimientoClientService } from './reconocimiento-client.service.js';
import { ReconocimientoStorageService } from './reconocimiento-storage.service.js';
import {
  RECONOCIMIENTO_CONFIG,
  reconocimientoConfig,
} from './reconocimiento.config.js';

// HTTP, guards, Multer, pipes y servicio son reales; sustituimos persistencia y Python.
describe('reconocimiento HTTP', () => {
  let app: INestApplication;
  let actor: UsuarioAutenticado;
  const base = '/api/reconocimiento';
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ9sAAAAASUVORK5CYII=',
    'base64',
  );
  const reference = {
    idReferencia: 17,
    idProducto: 7,
    archivo: 'photo.png',
    sha256: 'a'.repeat(64),
    mimeType: 'image/png',
    activo: true,
    estado: 'PENDIENTE',
  };
  const prisma = {
    producto: { findUnique: vi.fn() },
    productoSucursal: { findFirst: vi.fn(), findMany: vi.fn() },
    sucursal: { findUnique: vi.fn() },
    referenciaVisual: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const client = {
    isConfigured: vi.fn(() => false),
    getHealth: vi.fn(),
    search: vi.fn(),
  };
  const imageValidator = new ReconocimientoStorageService();
  const storage = {
    validateImage: imageValidator.validateImage.bind(imageValidator),
    save: vi.fn(),
    read: vi.fn(),
    remove: vi.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReconocimientoController],
      providers: [
        ReconocimientoService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReconocimientoClientService, useValue: client },
        { provide: ReconocimientoStorageService, useValue: storage },
        {
          provide: RECONOCIMIENTO_CONFIG,
          useValue: { ...reconocimientoConfig, workerEnabled: false },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(
      (
        req: Request & { user?: UsuarioAutenticado },
        _res: Response,
        next: NextFunction,
      ) => {
        req.user = actor;
        next();
      },
    );
    app.useGlobalGuards(
      new SuperadminGuard(new Reflector()),
      new PermisosGuard(new Reflector()),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    actor = {
      idUsuario: 1,
      correo: 'prueba@example.invalid',
      estado: 'ACTIVO',
      rol: { idRol: 3, nombre: 'ADMIN_TIENDA' },
      permisos: ['LOGISTICA_VER', 'LOGISTICA_GESTIONAR'],
      sucursales: [2],
    };
    prisma.producto.findUnique.mockResolvedValue({
      idProducto: 7,
      estado: true,
    });
    prisma.productoSucursal.findFirst.mockResolvedValue({
      idProductoSucursal: 9,
    });
    prisma.productoSucursal.findMany.mockResolvedValue([]);
    prisma.sucursal.findUnique.mockResolvedValue({
      idSucursal: 2,
      activo: true,
    });
    prisma.referenciaVisual.groupBy.mockResolvedValue([]);
    prisma.referenciaVisual.findMany.mockResolvedValue([]);
    prisma.referenciaVisual.count.mockResolvedValue(0);
    prisma.referenciaVisual.upsert.mockResolvedValue(reference);
    prisma.referenciaVisual.findUnique.mockResolvedValue(reference);
    prisma.referenciaVisual.findUniqueOrThrow.mockResolvedValue(reference);
    prisma.referenciaVisual.update.mockResolvedValue(reference);
    prisma.referenciaVisual.updateMany.mockResolvedValue({ count: 1 });
    client.getHealth.mockResolvedValue({
      status: 'ok',
      modelVersion: 'test@1',
      referenceCount: 0,
      modelLoaded: true,
    });
    storage.save.mockResolvedValue({
      archivo: reference.archivo,
      sha256: reference.sha256,
      mimeType: reference.mimeType,
    });
    storage.read.mockResolvedValue(png);
    storage.remove.mockResolvedValue(undefined);
  });

  it('protege lectura y administración con sus permisos respectivos', async () => {
    actor.permisos = [];
    await request(app.getHttpServer())
      .get(base + '/estado')
      .expect(403);
    actor.permisos = ['LOGISTICA_VER'];
    await request(app.getHttpServer())
      .get(base + '/estado')
      .expect(200);
    await request(app.getHttpServer())
      .post(base + '/productos/7/referencias')
      .attach('file', png, { filename: 'photo.png', contentType: 'image/png' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(base + '/referencias/17')
      .expect(403);
    await request(app.getHttpServer())
      .post(base + '/referencias/17/reintentar')
      .expect(403);
    await request(app.getHttpServer())
      .post(base + '/productos/7/reindexar')
      .expect(403);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('reserva la reindexación global al superadministrador', async () => {
    await request(app.getHttpServer())
      .post(base + '/reindexar')
      .expect(403);
    expect(prisma.referenciaVisual.updateMany).not.toHaveBeenCalled();
    actor.rol.nombre = 'SUPERADMIN';
    const response = await request(app.getHttpServer())
      .post(base + '/reindexar')
      .expect(201);
    expect(response.body).toEqual({ referenciasPendientes: 1 });
    expect(prisma.referenciaVisual.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activo: true, producto: { estado: true } },
        data: expect.objectContaining({
          estado: 'PENDIENTE',
          leaseToken: null,
        }),
      }),
    );
  });

  it('valida y convierte campos multipart y rechaza sucursales ajenas', async () => {
    const response = await request(app.getHttpServer())
      .post(base + '/buscar')
      .field('idSucursal', '2')
      .attach('file', png, { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);
    expect(response.body).toMatchObject({
      idSucursal: 2,
      estado: 'SIN_REFERENCIAS',
      requiereConfirmacion: true,
    });
    expect(prisma.sucursal.findUnique).toHaveBeenCalledWith({
      where: { idSucursal: 2 },
    });
    await request(app.getHttpServer())
      .post(base + '/buscar')
      .field('idSucursal', '3')
      .attach('file', png, { filename: 'photo.png', contentType: 'image/png' })
      .expect(403);
    expect(client.search).not.toHaveBeenCalled();
  });

  it('rechaza campos ausentes, fuera de rango y no admitidos', async () => {
    for (const fields of [
      {},
      { idSucursal: '0' },
      { idSucursal: 'abc' },
      { idSucursal: '2', limite: '11' },
      { idSucursal: '2', extra: 'x' },
    ]) {
      const api = request(app.getHttpServer()).post(base + '/buscar');
      for (const [key, value] of Object.entries(fields)) api.field(key, value);
      await api
        .attach('file', png, {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(400);
    }
    expect(client.getHealth).not.toHaveBeenCalled();
  });

  it('requiere una foto válida y limita tamaño y cantidad de archivos', async () => {
    await request(app.getHttpServer())
      .post(base + '/buscar')
      .field('idSucursal', '2')
      .expect(400);
    await request(app.getHttpServer())
      .post(base + '/productos/7/referencias')
      .expect(400);
    await request(app.getHttpServer())
      .post(base + '/productos/7/referencias')
      .attach('file', Buffer.from('text'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(base + '/productos/7/referencias')
      .attach('file', Buffer.alloc(8 * 1024 * 1024 + 1), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(413);
    await request(app.getHttpServer())
      .post(base + '/productos/7/referencias')
      .attach('file', png, { filename: 'photo.png', contentType: 'image/png' })
      .attach('file', png, { filename: 'other.png', contentType: 'image/png' })
      .expect(400);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('registra la referencia vinculada al producto de la URL', async () => {
    const response = await request(app.getHttpServer())
      .post(base + '/productos/7/referencias')
      .attach('file', png, { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);
    expect(response.body).toMatchObject({
      idReferencia: 17,
      idProducto: 7,
      imagenUrl: base + '/referencias/17/imagen',
    });
    expect(prisma.referenciaVisual.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idProducto_sha256: { idProducto: 7, sha256: reference.sha256 },
        },
      }),
    );
  });

  it('valida paginación, IDs y acceso al producto antes de listar', async () => {
    for (const id of [
      'no-es-id',
      '0',
      '-1',
      '2147483648',
      '9007199254740993',
    ]) {
      await request(app.getHttpServer())
        .get(base + `/productos/${id}/referencias`)
        .expect(400);
      await request(app.getHttpServer())
        .get(base + `/referencias/${id}/imagen`)
        .expect(400);
    }
    await request(app.getHttpServer())
      .get(base + '/productos/7/referencias?pagina=0')
      .expect(400);
    await request(app.getHttpServer())
      .get(base + '/productos/7/referencias?limite=101')
      .expect(400);
    await request(app.getHttpServer())
      .get(base + '/productos/7/referencias?extra=x')
      .expect(400);
    const response = await request(app.getHttpServer())
      .get(base + '/productos/7/referencias?pagina=2&limite=3')
      .expect(200);
    expect(response.body).toMatchObject({
      pagina: 2,
      limite: 3,
      total: 0,
      data: [],
    });
    expect(prisma.referenciaVisual.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 3, take: 3 }),
    );
    prisma.productoSucursal.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(base + '/productos/7/referencias')
      .expect(403);
  });

  it('sirve la imagen con tipo MIME y encabezados privados', async () => {
    const response = await request(app.getHttpServer())
      .get(base + '/referencias/17/imagen')
      .expect(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.body).toEqual(png);
  });
});
