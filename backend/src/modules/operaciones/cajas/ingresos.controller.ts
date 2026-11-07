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
  CrearIngresoSchema,
  ListarIngresosSchema,
} from './dto/movimientos-caja.dto.js';
import { MovimientosCajaService } from './movimientos-caja.service.js';

@Controller('ingresos')
@UseFilters(OperacionesPrismaFilter)
export class IngresosController {
  constructor(
    @Inject(MovimientosCajaService)
    private readonly movimientos: MovimientosCajaService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.CAJA_VER)
  listar(
    @Query(new ZodValidationPipe(ListarIngresosSchema))
    dto: z.infer<typeof ListarIngresosSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.movimientos.listarIngresos(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.CAJA_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.movimientos.obtenerIngreso(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.CAJA_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(CrearIngresoSchema))
    dto: z.infer<typeof CrearIngresoSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.movimientos.crearIngreso(dto, actor);
  }
}
