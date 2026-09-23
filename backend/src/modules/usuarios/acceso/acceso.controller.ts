import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { SoloSuperadmin } from '../../../common/decorators/solo-superadmin.decorator.js';
import { UsuarioActual } from '../../../common/decorators/usuario-actual.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { AccesoService } from './acceso.service.js';
import {
  ActualizarRolSchema,
  AsignarPermisoSchema,
  AsignarRolSchema,
  CrearRolSchema,
} from './dto/acceso.dto.js';
import type {
  ActualizarRolDto,
  AsignarPermisoDto,
  AsignarRolDto,
  CrearRolDto,
} from './dto/acceso.dto.js';

@Controller()
@SoloSuperadmin()
export class AccesoController {
  constructor(private readonly acceso: AccesoService) {}

  @Get('roles')
  listarRoles(@UsuarioActual() actor: UsuarioAutenticado) {
    return this.acceso.listarRoles(actor);
  }

  @Post('roles')
  crearRol(
    @UsuarioActual() actor: UsuarioAutenticado,
    @Body(new ZodValidationPipe(CrearRolSchema)) dto: CrearRolDto,
  ) {
    return this.acceso.crearRol(actor, dto);
  }

  @Patch('roles/:idRol')
  actualizarRol(
    @UsuarioActual() actor: UsuarioAutenticado,
    @Param('idRol', ParseIntPipe) idRol: number,
    @Body(new ZodValidationPipe(ActualizarRolSchema)) dto: ActualizarRolDto,
  ) {
    return this.acceso.actualizarRol(actor, idRol, dto);
  }

  @Delete('roles/:idRol')
  desactivarRol(
    @UsuarioActual() actor: UsuarioAutenticado,
    @Param('idRol', ParseIntPipe) idRol: number,
  ) {
    return this.acceso.desactivarRol(actor, idRol);
  }

  @Post('usuarios/:idUsuario/roles')
  asignarRol(
    @UsuarioActual() actor: UsuarioAutenticado,
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Body(new ZodValidationPipe(AsignarRolSchema)) dto: AsignarRolDto,
  ) {
    return this.acceso.asignarRol(actor, idUsuario, dto.idRol);
  }

  @Delete('usuarios/:idUsuario/roles/:idRol')
  quitarRol(
    @UsuarioActual() actor: UsuarioAutenticado,
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idRol', ParseIntPipe) idRol: number,
  ) {
    return this.acceso.quitarRol(actor, idUsuario, idRol);
  }

  @Get('permisos')
  listarPermisos(@UsuarioActual() actor: UsuarioAutenticado) {
    return this.acceso.listarPermisos(actor);
  }

  @Post('roles/:idRol/permisos')
  asignarPermiso(
    @UsuarioActual() actor: UsuarioAutenticado,
    @Param('idRol', ParseIntPipe) idRol: number,
    @Body(new ZodValidationPipe(AsignarPermisoSchema)) dto: AsignarPermisoDto,
  ) {
    return this.acceso.asignarPermiso(actor, idRol, dto.idPermiso);
  }

  @Delete('roles/:idRol/permisos/:idPermiso')
  quitarPermiso(
    @UsuarioActual() actor: UsuarioAutenticado,
    @Param('idRol', ParseIntPipe) idRol: number,
    @Param('idPermiso', ParseIntPipe) idPermiso: number,
  ) {
    return this.acceso.quitarPermiso(actor, idRol, idPermiso);
  }
}
