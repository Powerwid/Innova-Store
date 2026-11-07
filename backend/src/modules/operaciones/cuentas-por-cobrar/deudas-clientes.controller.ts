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
import { CuentasPorCobrarService } from './cuentas-por-cobrar.service.js';
import { CrearAbonoDeudaSchema, ListarDeudasSchema } from './dto/cuentas-por-cobrar.dto.js';

@Controller('deudas-clientes')
@UseFilters(OperacionesPrismaFilter)
export class DeudasClientesController {
  constructor(
    @Inject(CuentasPorCobrarService)
    private readonly cobros: CuentasPorCobrarService,
  ) {}

  @Get()
  @RequierePermiso(PermisoSistema.DEUDAS_VER)
  listar(
    @Query(new ZodValidationPipe(ListarDeudasSchema))
    dto: z.infer<typeof ListarDeudasSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cobros.listarDeudasClientes(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.DEUDAS_VER)
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cobros.obtenerDeudaCliente(id, actor);
  }

  @Post(':id/abonos')
  @RequierePermiso(PermisoSistema.DEUDAS_GESTIONAR)
  abonar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(CrearAbonoDeudaSchema))
    dto: z.infer<typeof CrearAbonoDeudaSchema>,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cobros.crearAbonoDeuda(id, dto, actor);
  }
}
