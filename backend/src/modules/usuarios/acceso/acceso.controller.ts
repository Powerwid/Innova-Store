import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { SoloSuperadmin } from '../../../common/decorators/solo-superadmin.decorator.js';
import { UsuarioActual } from '../../../common/decorators/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { AccesoService } from './acceso.service.js';
import { ActualizarRolSchema, AsignarPermisoSchema, CambiarRolUsuarioSchema, CrearRolSchema, SincronizarPermisosSchema } from './dto/acceso.dto.js';
import type { ActualizarRolDto, AsignarPermisoDto, CambiarRolUsuarioDto, CrearRolDto, SincronizarPermisosDto } from './dto/acceso.dto.js';

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

  @Post('roles/:idRol/permisos')
  asignarPermiso(
    @Param('idRol', ParseIntPipe) idRol: number,
    @Body(new ZodValidationPipe(AsignarPermisoSchema)) dto: AsignarPermisoDto,
  ) {
    return this.acceso.asignarPermiso(idRol, dto.idPermiso);
  }

  @Delete('roles/:idRol/permisos/:idPermiso')
  quitarPermiso(
    @Param('idRol', ParseIntPipe) idRol: number,
    @Param('idPermiso', ParseIntPipe) idPermiso: number,
  ) {
    return this.acceso.quitarPermiso(idRol, idPermiso);
  }
}
