import { Module } from '@nestjs/common';
import { ReconocimientoController } from './reconocimiento.controller.js';
import { ReconocimientoService } from './reconocimiento.service.js';
import { ReconocimientoClientService } from './reconocimiento-client.service.js';
import { ReconocimientoStorageService } from './reconocimiento-storage.service.js';
import {
  RECONOCIMIENTO_CONFIG,
  reconocimientoConfig,
} from './reconocimiento.config.js';

@Module({
  controllers: [ReconocimientoController],
  providers: [
    { provide: RECONOCIMIENTO_CONFIG, useValue: reconocimientoConfig },
    ReconocimientoService,
    ReconocimientoClientService,
    ReconocimientoStorageService,
  ],
})
export class ReconocimientoModule {}
