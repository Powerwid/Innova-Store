import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator.js';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import { PermisoSistema } from '../../common/enums/permiso-sistema.enum.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import {
  ActualizarPersonaSchema,
  CrearPersonaSchema,
  ListarPersonasSchema,
} from './dto/persona.dto.js';
import type {
  ActualizarPersonaDto,
  CrearPersonaDto,
  ListarPersonasDto,
} from './dto/persona.dto.js';
import { PersonasService } from './personas.service.js';

@Controller('personas')
export class PersonasController {
  constructor(private readonly personas: PersonasService) {}

  @Get()
  @RequierePermiso(PermisoSistema.PERSONAS_VER)
  listar(
    @Query(new ZodValidationPipe(ListarPersonasSchema)) dto: ListarPersonasDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.personas.listar(dto, actor);
  }

  @Get(':tipo/:id')
  @RequierePermiso(PermisoSistema.PERSONAS_VER)
  obtener(
    @Param('tipo') tipoEntrada: string,
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.personas.obtener(this.personas.validarTipo(tipoEntrada), id, actor);
  }

  @Post()
  @RequierePermiso(PermisoSistema.PERSONAS_GESTIONAR)
  crear(
    @Body(new ZodValidationPipe(CrearPersonaSchema)) dto: CrearPersonaDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.personas.crear(dto, actor);
  }

  @Patch(':tipo/:id')
  @RequierePermiso(PermisoSistema.PERSONAS_GESTIONAR)
  actualizar(
    @Param('tipo') tipoEntrada: string,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(ActualizarPersonaSchema)) dto: ActualizarPersonaDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    const tipo = this.personas.validarTipo(tipoEntrada);
    return this.personas.actualizar(tipo, id, dto, actor);
  }

  @Delete(':tipo/:id')
  @RequierePermiso(PermisoSistema.PERSONAS_GESTIONAR)
  eliminar(
    @Param('tipo') tipoEntrada: string,
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    const tipo = this.personas.validarTipo(tipoEntrada);
    return this.personas.eliminar(tipo, id, actor);
  }
}
