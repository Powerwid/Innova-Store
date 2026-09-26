import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { SoloSuperadmin } from '../../../common/decorators/solo-superadmin.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { AccesoService } from './acceso.service.js';
import { CrearRolSchema, SincronizarPermisosSchema } from './dto/acceso.dto.js';
import type { CrearRolDto, SincronizarPermisosDto } from './dto/acceso.dto.js';

@Controller()
@SoloSuperadmin()
export class AccesoController {
  constructor(private readonly acceso: AccesoService) { }

  @Get('roles')
  listarRoles() {
    return this.acceso.listarRoles();
  }

  @Post('roles')
  crearRol(
    @Body(new ZodValidationPipe(CrearRolSchema)) dto: CrearRolDto,
  ) {
    return this.acceso.crearRol(dto);
  }

  @Delete('roles/:idRol')
  eliminarRol(@Param('idRol', ParseIntPipe) idRol: number) {
    return this.acceso.eliminarRol(idRol);
  }

  @Get('permisos')
  listarPermisos() {
    return this.acceso.listarPermisos();
  }

  @Put('roles/:idRol/permisos')
  sincronizarPermisos(
    @Param('idRol', ParseIntPipe) idRol: number,
    @Body(new ZodValidationPipe(SincronizarPermisosSchema)) dto: SincronizarPermisosDto,
  ) {
    return this.acceso.sincronizarPermisos(idRol, dto.idsPermisos);
  }

}
