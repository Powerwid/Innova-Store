import { Controller, Get, Param } from '@nestjs/common';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator.js';
import { DocumentosService } from './documentos.service.js';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  @Get(':tipo/:numero')
  @RequierePermiso('DOCUMENTOS_CONSULTAR')
  consultar(@Param('tipo') tipo: string, @Param('numero') numero: string) {
    return this.documentos.consultar(tipo, numero);
  }
}
