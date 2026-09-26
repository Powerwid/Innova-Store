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
import { Autenticado } from '../../common/decorators/autenticado.decorator.js';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
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
import { ForbiddenException } from '@nestjs/common';

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
  @RequierePermiso(PermisoSistema.SUCURSALES_CREAR)
  crear(
    @Body(new ZodValidationPipe(CrearSucursalSchema)) dto: CrearSucursalDto,
  ) {
    return this.sucursales.crear(dto);
  }

  @Patch(':id')
  @Autenticado()
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(ActualizarSucursalSchema))
    dto: ActualizarSucursalDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    const requeridos = [
      ...(dto.nombre !== undefined || dto.perfil !== undefined
        ? [PermisoSistema.SUCURSALES_EDITAR]
        : []),
      ...(dto.activo === true ? [PermisoSistema.SUCURSALES_ACTIVAR] : []),
      ...(dto.activo === false ? [PermisoSistema.SUCURSALES_DESACTIVAR] : []),
    ];
    if (requeridos.some((permiso) => !actor.permisos.includes(permiso))) {
      throw new ForbiddenException(
        'Permiso requerido para actualizar la sucursal',
      );
    }
    return this.sucursales.actualizar(id, dto);
  }
}
