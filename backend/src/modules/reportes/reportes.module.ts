import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';
import { ReportesExportService } from './reportes-export.service.js';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, ReportesExportService],
  exports: [ReportesExportService],
})
export class ReportesModule {}
