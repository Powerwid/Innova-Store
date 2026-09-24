import { Module } from '@nestjs/common';
import { DecolectaClient } from './decolecta.client.js';
import { DocumentosController } from './documentos.controller.js';
import { DocumentosService } from './documentos.service.js';

@Module({
  controllers: [DocumentosController],
  providers: [DecolectaClient, DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
