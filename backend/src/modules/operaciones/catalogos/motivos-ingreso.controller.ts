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
  ActualizarMotivoIngresoSchema,
  ListarCatalogosSchema,
  MotivoIngresoSchema,
} from './dto/catalogos.dto.js';

@Controller('motivos-ingreso')
@UseFilters(OperacionesPrismaFilter)
export class MotivosIngresoController {
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
    return this.catalogos.listarMotivosIngreso(dto);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.obtenerMotivoIngreso(id);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(MotivoIngresoSchema))
    dto: z.infer<typeof MotivoIngresoSchema>,
  ) {
    return this.catalogos.crearMotivoIngreso(dto);
  }

  @Patch(':id')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(ActualizarMotivoIngresoSchema))
    dto: z.infer<typeof ActualizarMotivoIngresoSchema>,
  ) {
    return this.catalogos.actualizarMotivoIngreso(id, dto);
  }

  @Delete(':id')
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.eliminarMotivoIngreso(id);
  }
}
