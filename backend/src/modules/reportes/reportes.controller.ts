import {
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { z } from 'zod';
import { Autenticado } from '../../common/decorators/autenticado.decorator.js';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import {
  ConsultaReporteSchema,
  TipoReporteSchema,
  type ConsultaReporte,
  type TipoReporte,
} from './reportes.definition.js';
import { ReportesService } from './reportes.service.js';
import { ReportesExportService } from './reportes-export.service.js';

@Controller('reportes')
@Autenticado()
export class ReportesController {
  constructor(
    @Inject(ReportesService) private readonly reportes: ReportesService,
    @Inject(ReportesExportService)
    private readonly exports: ReportesExportService,
  ) {}

  @Get(':tipo')
  @Header('Cache-Control', 'private, no-store')
  obtener(
    @Param('tipo', new ZodValidationPipe(TipoReporteSchema)) tipo: TipoReporte,
    @Query(new ZodValidationPipe(ConsultaReporteSchema)) q: ConsultaReporte,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    // La autorización del permiso específico y sucursal precede a cualquier consulta.
    return this.reportes.obtener(tipo, q, actor);
  }

  @Get(':tipo/exportar/:formato')
  @Header('Cache-Control', 'private, no-store')
  async exportar(
    @Param('tipo', new ZodValidationPipe(TipoReporteSchema)) tipo: TipoReporte,
    @Param('formato', new ZodValidationPipe(z.enum(['ticket', 'excel', 'pdf'])))
    formato: 'ticket' | 'excel' | 'pdf',
    @Query(new ZodValidationPipe(ConsultaReporteSchema)) q: ConsultaReporte,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    const report = await this.reportes.obtener(tipo, q, actor, true);
    const buffer = await this.exports.generar(report, formato);
    const extension = formato === 'excel' ? 'xlsx' : 'pdf';
    return new StreamableFile(buffer, {
      type:
        formato === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      disposition: `attachment; filename="reporte-${tipo}-${formato}-${report.generadoEn.slice(0, 10)}.${extension}"`,
    });
  }
}
