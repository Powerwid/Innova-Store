import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { PrismaModule } from './database/prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { UsuariosModule } from './modules/usuarios/usuarios.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DocumentosModule } from './modules/documentos/documentos.module.js';
import { SucursalesModule } from './modules/sucursales/sucursales.module.js';
import { AdministracionModule } from './modules/administracion/administracion.module.js';
import { PersonasModule } from './modules/personas/personas.module.js';
import { LogisticaModule } from './modules/logistica/logistica.module.js';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { EstadoGuard } from './common/guards/estado.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { SuperadminGuard } from './common/guards/superadmin.guard.js';
import { PermisosGuard } from './common/guards/permisos.guard.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    UsuariosModule,
    DocumentosModule,
    SucursalesModule,
    AdministracionModule,
    PersonasModule,
    LogisticaModule,

    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: EstadoGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SuperadminGuard },
    { provide: APP_GUARD, useClass: PermisosGuard },
  ],
})
export class AppModule { }
