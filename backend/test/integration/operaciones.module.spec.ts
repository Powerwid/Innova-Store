import { Global, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/database/prisma/prisma.service.js';
import { CajasController } from '../../src/modules/operaciones/cajas/cajas.controller.js';
import { ComprasController } from '../../src/modules/operaciones/compras/compras.controller.js';
import { DeudasClientesController } from '../../src/modules/operaciones/cuentas-por-cobrar/deudas-clientes.controller.js';
import { OperacionesModule } from '../../src/modules/operaciones/operaciones.module.js';
import { VentasController } from '../../src/modules/operaciones/ventas/ventas.controller.js';

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class DatabaseTestModule {}

@Module({ imports: [DatabaseTestModule, OperacionesModule] })
class OperacionesTestModule {}

describe('Registro del módulo de operaciones', () => {
  it('resuelve los controladores y sus servicios por área', async () => {
    const app = await NestFactory.createApplicationContext(
      OperacionesTestModule,
      { logger: false, abortOnError: false },
    );
    try {
      expect(app.get(CajasController)).toBeInstanceOf(CajasController);
      expect(app.get(VentasController)).toBeInstanceOf(VentasController);
      expect(app.get(ComprasController)).toBeInstanceOf(ComprasController);
      expect(app.get(DeudasClientesController)).toBeInstanceOf(
        DeudasClientesController,
      );
    } finally {
      await app.close();
    }
  });
});
