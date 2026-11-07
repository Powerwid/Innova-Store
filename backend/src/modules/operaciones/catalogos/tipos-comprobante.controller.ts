import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { z } from 'zod';
import { RequierePermiso } from '../../../common/decorators/requiere-permiso.decorator.js';
import { PermisoSistema } from '../../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { OperacionesPrismaFilter } from '../compartido/operaciones.filter.js';
import { CatalogosService } from './catalogos.service.js';
import {
  ActualizarTipoComprobanteSchema,
  ListarTiposComprobanteSchema,
  TipoComprobanteSchema,
} from './dto/catalogos.dto.js';

@Controller('tipos-comprobante')
@UseFilters(OperacionesPrismaFilter)
export class TiposComprobanteController {
  constructor(
    @Inject(CatalogosService)
    private readonly catalogos: CatalogosService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  listar(
    @Query(new ZodValidationPipe(ListarTiposComprobanteSchema))
    dto: z.infer<typeof ListarTiposComprobanteSchema>,
  ) {
    return this.catalogos.listarTiposComprobante(dto);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.obtenerTipoComprobante(id);
  }

  @Post()
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(TipoComprobanteSchema))
    dto: z.infer<typeof TipoComprobanteSchema>,
  ) {
    return this.catalogos.crearTipoComprobante(dto);
  }

  @Patch(':id')
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(ActualizarTipoComprobanteSchema))
    dto: z.infer<typeof ActualizarTipoComprobanteSchema>,
  ) {
    return this.catalogos.actualizarTipoComprobante(id, dto);
  }

  @Delete(':id')
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.eliminarTipoComprobante(id);
  }
}
