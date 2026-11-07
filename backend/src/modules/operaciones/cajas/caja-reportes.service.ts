import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PermisoSistema } from '../../../common/enums/permiso-sistema.enum.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import {
  ReportesExportService,
  type FormatoReporte,
  type SeccionReporte,
} from '../../reportes/reportes-export.service.js';
import type {
  ColumnaReporte,
  FilaReporte,
  ResultadoReporte,
} from '../../reportes/reportes.definition.js';
import {
  MOTIVO_EGRESO_CREDITO_CLIENTE,
  MOTIVO_INGRESO_VENTA,
} from '../compartido/operaciones.constants.js';
import { TicketVentaSchema } from '../ventas/ticket-venta.js';
import { calcularResumenCaja } from './caja-resumen.js';
import { CajasService } from './cajas.service.js';

const date = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(value)
    : 'Caja abierta';
const money = (value: string) => `S/ ${value}`;
const column = (
  key: string,
  titulo: string,
  formato: ColumnaReporte['formato'] = 'texto',
): ColumnaReporte => ({ key, titulo, formato });
const sumPayments = (pagos: Array<{ monto: Prisma.Decimal }>) =>
  pagos.reduce((sum, p) => sum.plus(p.monto), new Prisma.Decimal(0));
const paymentNames = (pagos: Array<{ medioPago: { nombre: string } }>) =>
  [...new Set(pagos.map((p) => p.medioPago.nombre))].join(', ') || 'Sin pago';

@Injectable()
export class CajaReportesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CajasService)
    private readonly cajas: CajasService,
    @Inject(ReportesExportService)
    private readonly exports: ReportesExportService,
  ) {}

  obtener(idCaja: number, actor: UsuarioAutenticado) {
    return this.prisma.$transaction(
      async (db) => {
        const caja = await this.cajas.obtenerCaja(idCaja, actor, db);
        const [incomeCount, expenseCount, productCount] = await Promise.all([
          db.ingreso.count({ where: { idCaja } }),
          db.egreso.count({ where: { idCaja } }),
          db.ingresoProducto.count({ where: { ingreso: { idCaja } } }),
        ]);
        if (incomeCount + expenseCount + productCount > 20000)
          throw new BadRequestException(
            'Esta caja supera el límite de 20 000 movimientos y líneas para exportar.',
          );
        const canSee = (permission: string) =>
          actor.rol.nombre === 'SUPERADMIN' ||
          actor.permisos.includes(permission);
        const [ingresos, egresos] = await Promise.all([
          db.ingreso.findMany({
            where: { idCaja },
            orderBy: { fechaIngreso: 'asc' },
            include: {
              motivoIngreso: true,
              cliente: true,
              usuario: { select: { correo: true, perfil: true } },
              pagos: { include: { medioPago: true } },
              productos: {
                include: {
                  productoSucursal: {
                    include: { producto: { include: { unidadMedida: true } } },
                  },
                },
              },
            },
          }),
          db.egreso.findMany({
            where: { idCaja },
            orderBy: { fechaEgreso: 'asc' },
            include: {
              motivoEgreso: true,
              pagos: { include: { medioPago: true } },
              compra: true,
            },
          }),
        ]);
        const resumen = calcularResumenCaja(caja, ingresos, egresos);
        const ventas = ingresos.filter(
          (i) => i.idMotivoIngreso === MOTIVO_INGRESO_VENTA,
        );
        const gastos = egresos.filter(
          (e) => e.idMotivoEgreso !== MOTIVO_EGRESO_CREDITO_CLIENTE,
        );
        const usuario = caja.usuarioApertura.perfil
          ? `${caja.usuarioApertura.perfil.nombres} ${caja.usuarioApertura.perfil.apellidos}`
          : caja.usuarioApertura.correo;
        const secciones: SeccionReporte[] = [
          {
            titulo: 'Resumen',
            columnas: [
              column('concepto', 'Concepto'),
              column('valor', 'Valor'),
            ],
            data: [
              {
                concepto: 'Estado',
                valor: caja.fechaCierre ? 'Cerrada' : 'Abierta',
              },
              { concepto: 'Responsable de apertura', valor: usuario },
              { concepto: 'Apertura', valor: date(caja.fechaApertura) },
              { concepto: 'Cierre', valor: date(caja.fechaCierre) },
              { concepto: 'Monto de apertura', valor: money(resumen.apertura) },
              { concepto: 'Total vendido', valor: money(resumen.totalVentas) },
              {
                concepto: 'Ventas cobradas',
                valor: money(resumen.cobrosVentas),
              },
              {
                concepto: 'Saldo originado en ventas',
                valor: money(resumen.creditoOriginado),
              },
              { concepto: 'Otros ingresos', valor: money(resumen.ingresos) },
              { concepto: 'Gastos', valor: money(resumen.egresos) },
              {
                concepto: 'Pagos de compras y percepciones',
                valor: money(resumen.compras),
              },
              {
                concepto: 'Saldo esperado',
                valor: money(resumen.saldoCalculado),
              },
              {
                concepto: 'Efectivo esperado',
                valor: money(resumen.efectivoEsperado),
              },
              {
                concepto: 'Monto contado al cierre',
                valor:
                  caja.montoCierre === null
                    ? 'Pendiente de cierre'
                    : money(caja.montoCierre.toFixed(2)),
              },
              {
                concepto: 'Diferencia al cierre',
                valor:
                  caja.montoCierre === null
                    ? 'Pendiente de cierre'
                    : money(
                        caja.montoCierre
                          .minus(resumen.saldoCalculado)
                          .toFixed(2),
                      ),
              },
            ],
          },
          {
            titulo: 'Medios de pago',
            columnas: [
              column('nombre', 'Medio'),
              column('apertura', 'Apertura', 'dinero'),
              column('ventas', 'Ventas cobradas', 'dinero'),
              column('ingresos', 'Otros ingresos', 'dinero'),
              column('egresos', 'Gastos', 'dinero'),
              column('compras', 'Pagos de compras', 'dinero'),
              column('neto', 'Neto', 'dinero'),
              column('esperado', 'Saldo esperado', 'dinero'),
            ],
            data: resumen.mediosPago.map((m) => ({
              ...m,
              esperado: new Prisma.Decimal(m.apertura).plus(m.neto).toFixed(2),
            })),
          },
        ];
        if (canSee(PermisoSistema.VENTAS_VER)) {
          secciones.push({
            titulo: 'Ventas',
            columnas: [
              column('numero', 'Venta'),
              column('fecha', 'Fecha'),
              column('cliente', 'Cliente'),
              column('medios', 'Medios de pago'),
              column('importe', 'Total vendido', 'dinero'),
              column('cobrado', 'Cobrado', 'dinero'),
              column('pendiente', 'Saldo originado', 'dinero'),
            ],
            data: ventas.map((v) => {
              const saved = TicketVentaSchema.safeParse(v.ticketDatos);
              return {
                numero: `V-${v.idIngreso}`,
                fecha: date(v.fechaIngreso),
                cliente: saved.success
                  ? saved.data.cliente.nombre
                  : (v.cliente?.nombre ?? 'Clientes varios'),
                medios: paymentNames(v.pagos),
                importe: v.monto.toFixed(2),
                cobrado: sumPayments(v.pagos).toFixed(2),
                pendiente: v.monto.minus(sumPayments(v.pagos)).toFixed(2),
              };
            }),
          });
          const productos = new Map<
            number,
            {
              producto: string;
              unidad: string;
              cantidad: Prisma.Decimal;
              importe: Prisma.Decimal;
              ventas: Set<number>;
            }
          >();
          for (const venta of ventas)
            for (const linea of venta.productos) {
              const p = linea.productoSucursal.producto;
              const current = productos.get(p.idProducto) ?? {
                producto: p.nombre,
                unidad: p.unidadMedida.simbolo,
                cantidad: new Prisma.Decimal(0),
                importe: new Prisma.Decimal(0),
                ventas: new Set<number>(),
              };
              current.cantidad = current.cantidad.plus(linea.cantidad);
              current.importe = current.importe.plus(
                linea.cantidad.times(linea.precioUnitario),
              );
              current.ventas.add(venta.idIngreso);
              productos.set(p.idProducto, current);
            }
          secciones.push({
            titulo: 'Productos vendidos',
            columnas: [
              column('producto', 'Producto'),
              column('unidad', 'Unidad'),
              column('cantidad', 'Cantidad', 'cantidad'),
              column('ventas', 'Ventas', 'numero'),
              column('importe', 'Importe vendido', 'dinero'),
            ],
            data: [...productos.values()]
              .sort((a, b) => b.importe.comparedTo(a.importe))
              .map((p) => ({
                producto: p.producto,
                unidad: p.unidad,
                cantidad: p.cantidad.toFixed(3),
                ventas: p.ventas.size,
                importe: p.importe.toFixed(2),
              })),
          });
        }
        secciones.push(
          {
            titulo: 'Otros ingresos',
            columnas: [
              column('fecha', 'Fecha'),
              column('concepto', 'Motivo / concepto'),
              column('medios', 'Medios de pago'),
              column('importe', 'Cobrado', 'dinero'),
            ],
            data: ingresos
              .filter((i) => i.idMotivoIngreso !== MOTIVO_INGRESO_VENTA)
              .map((i) => ({
                fecha: date(i.fechaIngreso),
                concepto:
                  i.motivoIngreso.motivo + (i.detalle ? ` · ${i.detalle}` : ''),
                medios: paymentNames(i.pagos),
                importe: sumPayments(i.pagos).toFixed(2),
              })),
          },
          {
            titulo: 'Gastos',
            columnas: [
              column('fecha', 'Fecha'),
              column('concepto', 'Motivo / concepto'),
              column('medios', 'Medios de pago'),
              column('importe', 'Pagado', 'dinero'),
            ],
            data: gastos
              .filter((e) => e.idCompra === null)
              .map((e) => ({
                fecha: date(e.fechaEgreso),
                concepto:
                  e.motivoEgreso.motivo + (e.detalle ? ` · ${e.detalle}` : ''),
                medios: paymentNames(e.pagos),
                importe: sumPayments(e.pagos).toFixed(2),
              })),
          },
        );
        if (canSee(PermisoSistema.COMPRAS_VER))
          secciones.push({
            titulo: 'Pagos de compras',
            columnas: [
              column('numero', 'Compra'),
              column('fecha', 'Fecha de pago'),
              column('proveedor', 'Proveedor'),
              column('concepto', 'Motivo'),
              column('medios', 'Medios de pago'),
              column('importe', 'Pagado en esta caja', 'dinero'),
            ],
            data: gastos
              .filter((e) => e.idCompra !== null)
              .map((e) => ({
                numero: `C-${e.idCompra}`,
                fecha: date(e.fechaEgreso),
                proveedor: e.compra?.nombreProveedor ?? '-',
                concepto: e.motivoEgreso.motivo,
                medios: paymentNames(e.pagos),
                importe: sumPayments(e.pagos).toFixed(2),
              })),
          });
        const report: ResultadoReporte = {
          tipo: 'caja',
          titulo: `Reporte de caja #${idCaja}`,
          descripcion:
            'Dinero recibido y entregado en esta apertura de caja. Los pagos pendientes se muestran separados del dinero cobrado.',
          periodo: false,
          desde: null,
          hasta: null,
          sucursal: caja.sucursal.nombre,
          generadoEn: new Date().toISOString(),
          filtros: `Apertura: ${date(caja.fechaApertura)} · ${caja.fechaCierre ? `Cierre: ${date(caja.fechaCierre)}` : 'Caja abierta'}`,
          resumen: [
            { titulo: 'Apertura', valor: resumen.apertura, formato: 'dinero' },
            {
              titulo: 'Ventas cobradas',
              valor: resumen.cobrosVentas,
              formato: 'dinero',
            },
            {
              titulo: 'Otros ingresos',
              valor: resumen.ingresos,
              formato: 'dinero',
            },
            { titulo: 'Salidas', valor: resumen.salidas, formato: 'dinero' },
            {
              titulo: 'Saldo esperado',
              valor: resumen.saldoCalculado,
              formato: 'dinero',
            },
          ],
          columnas: secciones[0]!.columnas,
          data: secciones[0]!.data as FilaReporte[],
          total: ingresos.length + gastos.length,
          pagina: 1,
          limite: 20000,
        };
        return { report, secciones };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 30000,
      },
    );
  }

  async exportar(
    idCaja: number,
    formato: FormatoReporte,
    actor: UsuarioAutenticado,
  ) {
    const { report, secciones } = await this.obtener(idCaja, actor);
    return this.exports.generar(report, formato, secciones);
  }
}
