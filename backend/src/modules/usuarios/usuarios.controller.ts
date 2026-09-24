import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { UsuariosService } from './usuarios.service.js';
import { CrearUsuarioSchema } from './dto/crear-usuario.dto.js';
import type { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { ActualizarUsuarioSchema } from './dto/actualizar-usuario.dto.js';
import type { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto.js';
import { RequierePermiso } from '../../common/decorators/requiere-permiso.decorator.js';
import { Autenticado } from '../../common/decorators/autenticado.decorator.js';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { PermisoSistema } from '../../common/enums/permiso-sistema.enum.js';

@Controller('usuarios')
export class UsuariosController {
    constructor(
        private readonly usuariosService: UsuariosService,
    ) { }

    @Post()
    @RequierePermiso(PermisoSistema.USUARIOS_CREAR)
    crear(
        @Body(new ZodValidationPipe(CrearUsuarioSchema))
        dto: CrearUsuarioDto,
    ) {
        return this.usuariosService.crear(dto);
    }

    @Get()
    @RequierePermiso(PermisoSistema.USUARIOS_VER)
    listar() {
        return this.usuariosService.listar();
    }

    @Get(':id')
    @RequierePermiso(PermisoSistema.USUARIOS_VER)
    obtenerPorId(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.usuariosService.obtenerPorId(id);
    }

    @Patch(':id')
    @Autenticado()
    actualizar(
        @Param('id', ParseIntPipe) id: number,
        @UsuarioActual() actor: UsuarioAutenticado,

        @Body(new ZodValidationPipe(ActualizarUsuarioSchema))
        dto: ActualizarUsuarioDto,
    ) {
        return this.usuariosService.actualizar(id, dto, actor);
    }
}
