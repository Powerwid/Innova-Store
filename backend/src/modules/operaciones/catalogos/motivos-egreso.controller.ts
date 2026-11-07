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
  ActualizarMotivoEgresoSchema,
  ListarCatalogosSchema,
  MotivoEgresoSchema,
} from './dto/catalogos.dto.js';

@Controller('motivos-egreso')
@UseFilters(OperacionesPrismaFilter)
export class MotivosEgresoController {
  constructor(
    @Inject(CatalogosService)
    private readonly catalogos: CatalogosService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(ListarCatalogosSchema))
    dto: z.infer<typeof ListarCatalogosSchema>,
  ) {
    return this.catalogos.listarMotivosEgreso(dto);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.obtenerMotivoEgreso(id);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(MotivoEgresoSchema))
    dto: z.infer<typeof MotivoEgresoSchema>,
  ) {
    return this.catalogos.crearMotivoEgreso(dto);
  }

  @Patch(':id')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(ActualizarMotivoEgresoSchema))
    dto: z.infer<typeof ActualizarMotivoEgresoSchema>,
  ) {
    return this.catalogos.actualizarMotivoEgreso(id, dto);
  }

  @Delete(':id')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.eliminarMotivoEgreso(id);
  }
}
