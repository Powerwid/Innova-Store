import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { z } from 'zod';
import { RequierePermiso } from '../../../common/decorators/requiere-permiso.decorator.js';
import { UsuarioActual } from '../../../common/decorators/usuario-actual.decorator.js';
import { PermisoSistema } from '../../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { type UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { OperacionesPrismaFilter } from '../compartido/operaciones.filter.js';
import {
  CrearEgresoSchema,
  ListarEgresosSchema,
} from './dto/movimientos-caja.dto.js';
import { MovimientosCajaService } from './movimientos-caja.service.js';

@Controller('egresos')
@UseFilters(OperacionesPrismaFilter)
export class EgresosController {
  constructor(
    @Inject(MovimientosCajaService)
    private readonly movimientos: MovimientosCajaService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(ListarEgresosSchema))
    dto: z.infer<typeof ListarEgresosSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.movimientos.listarEgresos(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.movimientos.obtenerEgreso(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(CrearEgresoSchema))
    dto: z.infer<typeof CrearEgresoSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.movimientos.crearEgreso(dto, actor);
  }
}
