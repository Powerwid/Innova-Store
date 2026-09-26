import { Controller, Get, Param } from '@nestjs/common';
import { DocumentosService } from './documentos.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { Autenticado } from '../../common/decorators/autenticado.decorator.js';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService, private readonly prisma: PrismaService) {}

  @Get('tipos')
  @Autenticado()
  tipos() {
    return this.prisma.tipoDocumento.findMany({
      where: { activo: true },
      select: { idTipoDocumento: true, nombre: true },
      orderBy: { idTipoDocumento: 'asc' },
    });
  }

  @Get(':tipo/:numero')
  @Autenticado()
  consultar(@Param('tipo') tipo: string, @Param('numero') numero: string) {
    return this.documentos.consultar(tipo, numero);
  }
}
