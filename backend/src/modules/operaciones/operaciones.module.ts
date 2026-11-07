import { Module } from '@nestjs/common';
import { ReportesModule } from '../reportes/reportes.module.js';
import { CajaReportesService } from './cajas/caja-reportes.service.js';
import { CajasController } from './cajas/cajas.controller.js';
import { CajasService } from './cajas/cajas.service.js';
import { EgresosController } from './cajas/egresos.controller.js';
import { IngresosController } from './cajas/ingresos.controller.js';
import { MovimientosCajaService } from './cajas/movimientos-caja.service.js';
import { CatalogosService } from './catalogos/catalogos.service.js';
import { MotivosEgresoController } from './catalogos/motivos-egreso.controller.js';
import { MotivosIngresoController } from './catalogos/motivos-ingreso.controller.js';
import { TiposComprobanteController } from './catalogos/tipos-comprobante.controller.js';
import { InventarioOperacionesService } from './compartido/inventario-operaciones.service.js';
import { OperacionesAccesoService } from './compartido/operaciones-acceso.service.js';
import { OperacionesPrismaFilter } from './compartido/operaciones.filter.js';
import { ComprasController } from './compras/compras.controller.js';
import { ComprasService } from './compras/compras.service.js';
import { PercepcionesService } from './compras/percepciones.service.js';
import { CuentasPorCobrarService } from './cuentas-por-cobrar/cuentas-por-cobrar.service.js';
import { DeudasClientesController } from './cuentas-por-cobrar/deudas-clientes.controller.js';
import { TicketPdfService } from './ventas/ticket-pdf.service.js';
import { VentasController } from './ventas/ventas.controller.js';
import { VentasService } from './ventas/ventas.service.js';

@Module({
  imports: [ReportesModule],
  controllers: [
    CajasController,
    IngresosController,
    EgresosController,
    MotivosIngresoController,
    MotivosEgresoController,
    TiposComprobanteController,
    VentasController,
    ComprasController,
    DeudasClientesController,
  ],
  providers: [
    OperacionesAccesoService,
    InventarioOperacionesService,
    CatalogosService,
    CajasService,
    MovimientosCajaService,
    VentasService,
    PercepcionesService,
    ComprasService,
    CuentasPorCobrarService,
    OperacionesPrismaFilter,
    TicketPdfService,
    CajaReportesService,
  ],
})
export class OperacionesModule {}
