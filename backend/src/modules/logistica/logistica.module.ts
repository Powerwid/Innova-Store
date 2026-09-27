import { Module } from '@nestjs/common';
import { LogisticaController } from './logistica.controller.js';
import { LogisticaService } from './logistica.service.js';
import { LogisticaPrismaFilter } from './logistica.filter.js';

@Module({
  controllers: [LogisticaController],
  providers: [LogisticaService, LogisticaPrismaFilter],
})
export class LogisticaModule {}
