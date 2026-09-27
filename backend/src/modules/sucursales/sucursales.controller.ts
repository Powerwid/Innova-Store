import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator.js';
import { PermisoSistema } from '../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  ActualizarSucursalSchema,
  CrearSucursalSchema,
} from './dto/sucursal.dto.js';
import type {
  ActualizarSucursalDto,
  CrearSucursalDto,
} from './dto/sucursal.dto.js';
import { SucursalesService } from './sucursales.service.js';

@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursales: SucursalesService) {}

  @Get()
  @RequierePermiso(PermisoSistema.SUCURSALES_VER)
  listar() {
    return this.sucursales.listar();
  }

  @Get(':id')
  @RequierePermiso(PermisoSistema.SUCURSALES_VER)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.sucursales.obtener(id);
  }

  @Post()
  @RequierePermiso(PermisoSistema.SUCURSALES_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(CrearSucursalSchema)) dto: CrearSucursalDto,
  ) {
    return this.sucursales.crear(dto);
  }

  @Patch(':id')
  @RequierePermiso(PermisoSistema.SUCURSALES_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(ActualizarSucursalSchema))
    dto: ActualizarSucursalDto,
  ) {
    return this.sucursales.actualizar(id, dto);
  }
}
