import { Module } from '@nestjs/common';
import { LogisticaController } from './logistica.controller.js';
import { LogisticaService } from './logistica.service.js';
import { LogisticaPrismaFilter } from './logistica.filter.js';
import { ProductoImagenController } from './producto-imagen.controller.js';
import { ProductoImagenService } from './producto-imagen.service.js';

@Module({
  controllers: [LogisticaController, ProductoImagenController],
  providers: [LogisticaService, LogisticaPrismaFilter, ProductoImagenService],
})
export class LogisticaModule {}
