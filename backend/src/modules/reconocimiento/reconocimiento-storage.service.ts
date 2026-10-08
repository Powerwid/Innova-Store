import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import type {} from 'multer';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  RECONOCIMIENTO_CONFIG,
  reconocimientoConfig,
} from './reconocimiento.config.js';
import type { ReconocimientoConfig } from './reconocimiento.config.js';

export const RECOGNITION_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export interface StoredRecognitionImage {
  archivo: string;
  sha256: string;
  mimeType: string;
}

const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;
type ImageMime = keyof typeof imageTypes;

@Injectable()
export class ReconocimientoStorageService {
  private readonly directory: string;

  constructor(
    @Optional()
    @Inject(RECONOCIMIENTO_CONFIG)
    options: ReconocimientoConfig = reconocimientoConfig,
  ) {
    this.directory = resolve(options.storageDir);
  }

  validateImage(file: Express.Multer.File): void {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('Debes enviar una imagen');
    }
    if (
      file.buffer.length > RECOGNITION_MAX_IMAGE_BYTES ||
      file.size > RECOGNITION_MAX_IMAGE_BYTES
    ) {
      throw new BadRequestException('La imagen no puede superar los 8 MiB');
    }
    const mime = this.detectMime(file.buffer);
    if (!mime || mime !== file.mimetype) {
      throw new BadRequestException(
        'La imagen debe ser JPEG, PNG o WebP y coincidir con su tipo MIME',
      );
    }
  }

  async save(file: Express.Multer.File): Promise<StoredRecognitionImage> {
    this.validateImage(file);
    const mimeType = this.detectMime(file.buffer)!;
    const archivo = `${randomUUID()}.${imageTypes[mimeType]}`;
    await mkdir(this.directory, { recursive: true });
    // Exclusive creation prevents an existing file or symlink from being replaced.
    await writeFile(this.path(archivo), file.buffer, {
      flag: 'wx',
      mode: 0o600,
    });
    return {
      archivo,
      sha256: createHash('sha256').update(file.buffer).digest('hex'),
      mimeType,
    };
  }

  async read(archivo: string): Promise<Buffer> {
    return readFile(this.path(archivo));
  }

  async remove(archivo: string): Promise<void> {
    try {
      await unlink(this.path(archivo));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private path(archivo: string): string {
    // Only storage-generated names are valid; no directories or supplied filenames.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(
        archivo,
      )
    ) {
      throw new BadRequestException(
        'La referencia visual tiene una ruta inválida',
      );
    }
    return resolve(this.directory, archivo);
  }

  private detectMime(buffer: Buffer): ImageMime | undefined {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    )
      return 'image/jpeg';
    if (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    )
      return 'image/png';
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    )
      return 'image/webp';
    return undefined;
  }
}
