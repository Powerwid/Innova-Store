import { Module } from '@nestjs/common';
import {
  CajasController,
  ComprasController,
  DeudasClientesController,
  EgresosController,
  IngresosController,
  MotivosEgresoController,
  MotivosIngresoController,
  TiposComprobanteController,
  VentasController,
} from './operaciones.controller.js';
import { OperacionesPrismaFilter } from './operaciones.filter.js';
import { OperacionesService } from './operaciones.service.js';

@Module({
  controllers: [
    CajasController,
    MotivosIngresoController,
    MotivosEgresoController,
    TiposComprobanteController,
    IngresosController,
    EgresosController,
    VentasController,
    ComprasController,
    DeudasClientesController,
  ],
  providers: [OperacionesService, OperacionesPrismaFilter],
})
export class OperacionesModule {}
