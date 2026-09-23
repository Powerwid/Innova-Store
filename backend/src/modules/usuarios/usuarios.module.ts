import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { AccesoController } from './acceso/acceso.controller.js';
import { AccesoService } from './acceso/acceso.service.js';

@Module({
    controllers: [UsuariosController, AccesoController],
    providers: [UsuariosService, AccesoService],
    exports: [UsuariosService],
})
export class UsuariosModule { }
