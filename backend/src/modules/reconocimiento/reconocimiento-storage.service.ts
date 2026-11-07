import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  ImageStorage,
  MAX_IMAGE_BYTES,
} from '../../common/storage/image-storage.js';
import type { StoredImage } from '../../common/storage/image-storage.js';
import {
  RECONOCIMIENTO_CONFIG,
  reconocimientoConfig,
} from './reconocimiento.config.js';
import type { ReconocimientoConfig } from './reconocimiento.config.js';

export const RECOGNITION_MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
export type StoredRecognitionImage = StoredImage;

@Injectable()
export class ReconocimientoStorageService extends ImageStorage {
  constructor(
    @Optional()
    @Inject(RECONOCIMIENTO_CONFIG)
    options: ReconocimientoConfig = reconocimientoConfig,
  ) {
    super(options.storageDir);
  }
}
