import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseFilters,
} from '@nestjs/common';
import { z } from 'zod';
import { RequierePermiso } from '../../../common/decorators/requiere-permiso.decorator.js';
import { UsuarioActual } from '../../../common/decorators/usuario-actual.decorator.js';
import { PermisoSistema } from '../../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { type UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { OperacionesPrismaFilter } from '../compartido/operaciones.filter.js';
import { CajaReportesService } from './caja-reportes.service.js';
import { CajasService } from './cajas.service.js';
import {
  AbrirCajaSchema,
  CajaAbiertaQuerySchema,
  CerrarCajaSchema,
  ListarCajasSchema,
} from './dto/cajas.dto.js';

@Controller('cajas')
@UseFilters(OperacionesPrismaFilter)
export class CajasController {
  constructor(
    @Inject(CajasService)
    private readonly cajas: CajasService,
    @Inject(CajaReportesService) private readonly reportes: CajaReportesService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(ListarCajasSchema))
    dto: z.infer<typeof ListarCajasSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cajas.listarCajas(dto, actor);
  }

  @Get('abierta')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  abierta(
    @Query(new ZodValidationPipe(CajaAbiertaQuerySchema))
    dto: z.infer<typeof CajaAbiertaQuerySchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cajas.obtenerCajaAbiertaSucursal(dto.idSucursal, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cajas.obtenerCaja(id, actor);
  }

  @Get(':id/resumen')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  resumen(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cajas.obtenerResumenCaja(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  abrir(
    @Body(new ZodValidationPipe(AbrirCajaSchema))
    dto: z.infer<typeof AbrirCajaSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cajas.abrirCaja(dto, actor);
  }

  @Get(':id/reporte')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  @Header('Cache-Control', 'private, no-store')
  reporte(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.reportes.obtener(id, actor);
  }

  @Get(':id/reporte/:formato')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  @Header('Cache-Control', 'private, no-store')
  async exportarReporte(
    @Param('id', ParseIntPipe) id: number,
    @Param('formato', new ZodValidationPipe(z.enum(['ticket', 'excel', 'pdf'])))
    formato: 'ticket' | 'excel' | 'pdf',
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    const buffer = await this.reportes.exportar(id, formato, actor);
    return new StreamableFile(buffer, {
      type:
        formato === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      disposition: `attachment; filename="caja-${id}-${formato}.${formato === 'excel' ? 'xlsx' : 'pdf'}"`,
    });
  }

  @Patch(':id/cerrar')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(CerrarCajaSchema))
    dto: z.infer<typeof CerrarCajaSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cajas.cerrarCaja(id, dto, actor);
  }
}
