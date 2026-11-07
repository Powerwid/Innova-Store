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
import type { Request, Response, NextFunction } from 'express';
import { mkdtemp, readdir, rm, unlink } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { PermisosGuard } from '../../common/guards/permisos.guard.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { ProductoImagenController } from './producto-imagen.controller.js';
import {
  PRODUCTO_IMAGEN_DIRECTORY,
  ProductoImagenService,
} from './producto-imagen.service.js';

// HTTP, permisos, Multer y archivos son reales. No conecta con MySQL ni Python.
describe('foto comercial de producto HTTP', () => {
  let app: INestApplication;
  let directory: string;
  let actor: UsuarioAutenticado;
  let product: {
    idProducto: number;
    nombre: string;
    imagen: string | null;
    estado: boolean;
    createdAt: Date;
  };
  const prisma = {
    producto: { findUnique: vi.fn(), update: vi.fn() },
    referenciaVisual: { create: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  };
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ9sAAAAASUVORK5CYII=',
    'base64',
  );
  const path = '/api/logistica/productos/7/imagen';

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'innova-product-photo-'));
    const module = await Test.createTestingModule({
      controllers: [ProductoImagenController],
      providers: [
        ProductoImagenService,
        { provide: PrismaService, useValue: prisma },
        { provide: PRODUCTO_IMAGEN_DIRECTORY, useValue: directory },
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
    app.useGlobalGuards(new PermisosGuard(new Reflector()));
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    // Único objetivo de borrado: el directorio absoluto creado por mkdtemp para esta suite.
    if (directory && resolve(directory).startsWith(resolve(tmpdir()) + sep))
      await rm(directory, { recursive: true, force: true });
  });
  beforeEach(() => {
    vi.resetAllMocks();
    actor = {
      idUsuario: 2,
      correo: 'photo@example.invalid',
      estado: 'ACTIVO',
      rol: { idRol: 3, nombre: 'ADMIN_TIENDA' },
      permisos: ['LOGISTICA_VER', 'LOGISTICA_GESTIONAR'],
      sucursales: [1],
    };
    product = {
      idProducto: 7,
      nombre: 'Producto',
      imagen: null,
      estado: true,
      createdAt: new Date('2026-10-17T00:00:00.000Z'),
    };
    prisma.producto.findUnique.mockImplementation(async ({ where }) =>
      where.idProducto === 7 ? product : null,
    );
    prisma.producto.update.mockImplementation(async ({ data }) => {
      product = { ...product, ...data };
      return product;
    });
  });
  function upload(mime = 'image/png', body = png, target = path) {
    return request(app.getHttpServer())
      .post(target)
      .attach('file', body, { filename: '../../foto.png', contentType: mime });
  }

  it('guarda la foto comercial y la sirve sin crear referencias para reconocimiento', async () => {
    const response = await upload().expect(201);
    expect(response.body.imagen).toMatch(
      /^\/api\/logistica\/productos\/7\/imagen\/[a-f0-9-]+\.png$/,
    );
    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { imagen: response.body.imagen },
        where: { idProducto: 7, createdAt: product.createdAt },
      }),
    );
    expect(prisma.referenciaVisual.upsert).not.toHaveBeenCalled();
    expect(prisma.referenciaVisual.create).not.toHaveBeenCalled();
    expect(prisma.referenciaVisual.update).not.toHaveBeenCalled();
    const image = await request(app.getHttpServer())
      .get(response.body.imagen)
      .expect(200);
    expect(image.headers['content-type']).toContain('image/png');
    expect(image.headers['cache-control']).toBe('private, no-store');
    expect(image.headers['x-content-type-options']).toBe('nosniff');
    expect(image.body).toEqual(png);
  });
  it('puede actualizar la imagen de un producto inactivo sin activarlo', async () => {
    product.estado = false;
    const response = await upload().expect(201);
    expect(response.body.estado).toBe(false);
  });
  it('la lectura y escritura exigen los permisos correspondientes', async () => {
    actor.permisos = ['LOGISTICA_VER'];
    await upload().expect(403);
    expect(prisma.producto.update).not.toHaveBeenCalled();
    actor.permisos = ['LOGISTICA_GESTIONAR'];
    const response = await upload().expect(201);
    await request(app.getHttpServer()).get(response.body.imagen).expect(403);
  });
  it('rechaza producto inexistente y archivo ausente antes de actualizar', async () => {
    await upload(
      'image/png',
      png,
      '/api/logistica/productos/999/imagen',
    ).expect(404);
    await request(app.getHttpServer()).post(path).expect(400);
    expect(prisma.producto.update).not.toHaveBeenCalled();
  });
  it.each(['image/jpeg', 'image/svg+xml'])(
    'rechaza el MIME %s para bytes PNG',
    async (mime) => {
      const files = await readdir(directory);
      await upload(mime).expect(400);
      expect(prisma.producto.update).not.toHaveBeenCalled();
      expect(await readdir(directory)).toEqual(files);
    },
  );
  it('rechaza fotos superiores a 8 MiB', async () => {
    await upload('image/png', Buffer.alloc(8 * 1024 * 1024 + 1)).expect(413);
    expect(prisma.producto.update).not.toHaveBeenCalled();
  });
  it('limpia la foto nueva cuando falla la actualización de la base', async () => {
    const files = await readdir(directory);
    prisma.producto.update.mockRejectedValueOnce(
      new Error('Fallo simulado de persistencia'),
    );
    await expect(
      app
        .get(ProductoImagenService)
        .subir(7, {
          buffer: png,
          size: png.length,
          mimetype: 'image/png',
        } as Express.Multer.File),
    ).rejects.toThrow('Fallo simulado');
    expect(await readdir(directory)).toEqual(files);
  });
  it('reemplazar o quitar la imagen deja de servir la URL anterior', async () => {
    const first = await upload().expect(201);
    const second = await upload().expect(201);
    expect(first.body.imagen).not.toBe(second.body.imagen);
    await request(app.getHttpServer()).get(first.body.imagen).expect(404);
    await request(app.getHttpServer()).get(second.body.imagen).expect(200);
    product.imagen = null;
    await request(app.getHttpServer()).get(second.body.imagen).expect(404);
  });
  it('un archivo eliminado devuelve 404 y una ruta ajena no se puede leer', async () => {
    const response = await upload().expect(201);
    const file = response.body.imagen.split('/').at(-1);
    await unlink(join(directory, file));
    await request(app.getHttpServer()).get(response.body.imagen).expect(404);
    await expect(
      app.get(ProductoImagenService).obtener(7, '../secret.png'),
    ).rejects.toThrow('no encontrada');
  });
});
