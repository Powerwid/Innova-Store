import type { PrismaService } from '../../src/database/prisma/prisma.service.js';
import { CajasService } from '../../src/modules/operaciones/cajas/cajas.service.js';
import { MovimientosCajaService } from '../../src/modules/operaciones/cajas/movimientos-caja.service.js';
import { CatalogosService } from '../../src/modules/operaciones/catalogos/catalogos.service.js';
import { InventarioOperacionesService } from '../../src/modules/operaciones/compartido/inventario-operaciones.service.js';
import { OperacionesAccesoService } from '../../src/modules/operaciones/compartido/operaciones-acceso.service.js';
import { ComprasService } from '../../src/modules/operaciones/compras/compras.service.js';
import { PercepcionesService } from '../../src/modules/operaciones/compras/percepciones.service.js';
import { CuentasPorCobrarService } from '../../src/modules/operaciones/cuentas-por-cobrar/cuentas-por-cobrar.service.js';
import { VentasService } from '../../src/modules/operaciones/ventas/ventas.service.js';

export function crearServiciosOperaciones(prisma: PrismaService) {
  const acceso = new OperacionesAccesoService(prisma);
  const inventario = new InventarioOperacionesService();
  const catalogos = new CatalogosService(prisma);
  const cajas = new CajasService(prisma, acceso);
  const movimientos = new MovimientosCajaService(prisma, acceso, cajas);
  const ventas = new VentasService(prisma, movimientos, inventario);
  const percepciones = new PercepcionesService(prisma, movimientos);
  const compras = new ComprasService(
    prisma,
    acceso,
    cajas,
    movimientos,
    inventario,
    percepciones,
  );
  const cobros = new CuentasPorCobrarService(prisma, acceso, movimientos);
  return {
    acceso,
    inventario,
    catalogos,
    cajas,
    movimientos,
    ventas,
    percepciones,
    compras,
    cobros,
  };
}
