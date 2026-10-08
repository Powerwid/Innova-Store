import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  RECOGNITION_MAX_IMAGE_BYTES,
  ReconocimientoStorageService,
} from './reconocimiento-storage.service.js';
import { reconocimientoConfig } from './reconocimiento.config.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 1, 2, 0xff, 0xd9]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from('RIFF0000WEBP', 'ascii');

function image(buffer: Buffer, mimetype = 'image/jpeg'): Express.Multer.File {
  return {
    buffer,
    mimetype,
    size: buffer.length,
    originalname: '../../original.jpg',
  } as Express.Multer.File;
}

describe('ReconocimientoStorageService', () => {
  let directory: string;
  let service: ReconocimientoStorageService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'innova-recognition-test-'));
    service = new ReconocimientoStorageService({
      ...reconocimientoConfig,
      storageDir: directory,
    });
  });

  afterEach(async () => {
    // The deletion target is exactly the directory returned by mkdtemp for this test.
    await rm(directory, { recursive: true, force: true });
  });

  it.each([
    ['image/jpeg', jpeg, 'jpg'],
    ['image/png', png, 'png'],
    ['image/webp', webp, 'webp'],
  ] as const)(
    'guarda %s con nombre independiente, checksum y lectura idéntica',
    async (mime, buffer, extension) => {
      const stored = await service.save(image(buffer, mime));
      expect(stored.archivo).toMatch(
        new RegExp(`^[0-9a-f-]{36}\\.${extension}$`),
      );
      expect(stored.sha256).toBe(
        createHash('sha256').update(buffer).digest('hex'),
      );
      expect(stored.mimeType).toBe(mime);
      await expect(service.read(stored.archivo)).resolves.toEqual(buffer);
      expect(await readdir(directory)).toEqual([stored.archivo]);
    },
  );

  it('crea el directorio configurado al guardar', async () => {
    const nested = new ReconocimientoStorageService({
      ...reconocimientoConfig,
      storageDir: join(directory, 'references', 'images'),
    });
    const saved = await nested.save(image(jpeg));
    await expect(nested.read(saved.archivo)).resolves.toEqual(jpeg);
  });

  it('rechaza archivos vacíos, firmas desconocidas y MIME falsificado antes de guardar', async () => {
    for (const file of [
      image(Buffer.alloc(0)),
      image(Buffer.from('not an image')),
      image(png, 'image/jpeg'),
      image(jpeg, 'image/svg+xml'),
    ]) {
      expect(() => service.validateImage(file)).toThrow(BadRequestException);
      await expect(service.save(file)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(await readdir(directory)).toEqual([]);
  });

  it('valida el tamaño real aunque los metadatos declaren un tamaño menor', async () => {
    const oversized = Buffer.alloc(RECOGNITION_MAX_IMAGE_BYTES + 1);
    jpeg.copy(oversized);
    const file = { ...image(oversized), size: 1 };
    await expect(service.save(file)).rejects.toThrow('8 MiB');
    expect(await readdir(directory)).toEqual([]);
  });

  it('admite el tamaño máximo exacto', () => {
    const max = Buffer.alloc(RECOGNITION_MAX_IMAGE_BYTES);
    jpeg.copy(max);
    expect(() => service.validateImage(image(max))).not.toThrow();
  });

  it('asigna un nombre único a cada captura del mismo archivo', async () => {
    const first = await service.save(image(jpeg));
    const second = await service.save(image(jpeg));
    expect(first.archivo).not.toBe(second.archivo);
    expect(first.sha256).toBe(second.sha256);
  });

  it('elimina referencias y tolera una segunda eliminación', async () => {
    const stored = await service.save(image(jpeg));
    await service.remove(stored.archivo);
    await expect(service.remove(stored.archivo)).resolves.toBeUndefined();
    expect(await readdir(directory)).toEqual([]);
  });

  it.each([
    '../secret.jpg',
    '..\\secret.jpg',
    '/etc/passwd',
    'C:\\private\\secret.jpg',
    '%2e%2e%2fsecret.jpg',
    'image.jpg',
    '00000000-0000-4000-8000-000000000000.jpg/../secret.jpg',
  ])('rechaza rutas ajenas al almacenamiento (%s)', async (archivo) => {
    await expect(service.read(archivo)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.remove(archivo)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
