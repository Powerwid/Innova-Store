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
import { ComprasService } from './compras.service.js';
import {
  CrearCompraSchema,
  CrearPercepcionSchema,
  ListarComprasSchema,
  ListarPercepcionesSchema,
  PagoCompraSchema,
} from './dto/compras.dto.js';
import { PercepcionesService } from './percepciones.service.js';

@Controller('compras')
@UseFilters(OperacionesPrismaFilter)
export class ComprasController {
  constructor(
    @Inject(PercepcionesService)
    private readonly percepciones: PercepcionesService,
    @Inject(ComprasService)
    private readonly compras: ComprasService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  listar(
    @Query(new ZodValidationPipe(ListarComprasSchema))
    dto: z.infer<typeof ListarComprasSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.compras.listarCompras(dto, actor);
  }

  @Get('percepciones')
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  listarPercepciones(
    @Query(new ZodValidationPipe(ListarPercepcionesSchema))
    dto: z.infer<typeof ListarPercepcionesSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.percepciones.listarPercepciones(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.COMPRAS_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.compras.obtenerCompra(id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(CrearCompraSchema))
    dto: z.infer<typeof CrearCompraSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.compras.crearCompra(dto, actor);
  }

  @Post(':id/pagos')
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(PagoCompraSchema))
    dto: z.infer<typeof PagoCompraSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.compras.registrarPagoCompra(id, dto, actor);
  }

  @Post(':id/percepciones')
  @RequierePermiso(PermisoSistema.COMPRAS_GESTIONAR)
  registrarPercepcion(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(CrearPercepcionSchema))
    dto: z.infer<typeof CrearPercepcionSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.compras.registrarPercepcionCompra(id, dto, actor);
  }
}
