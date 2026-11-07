import { z } from 'zod';
import { PermisoSistema as P } from '../../common/enums/permiso-sistema.enum.js';

export const TipoReporteSchema = z.enum([
  'ventas',
  'productos',
  'compras',
  'caja',
  'inventario',
  'deudas',
]);
export type TipoReporte = z.infer<typeof TipoReporteSchema>;
const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa una fecha AAAA-MM-DD')
  .refine((value) => {
    const parsed = new Date(value + 'T00:00:00Z');
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'La fecha no existe');
export const ConsultaReporteSchema = z
  .object({
    idSucursal: z.coerce.number().int().positive().max(2147483647).optional(),
    desde: fecha.optional(),
    hasta: fecha.optional(),
    buscar: z.string().trim().max(100).default(''),
    estado: z
      .enum(['todos', 'critico', 'agotado', 'pendiente', 'vencida', 'pagada'])
      .default('todos'),
    pagina: z.coerce.number().int().min(1).max(1000000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict()
  .superRefine((q, ctx) => {
    if (!!q.desde !== !!q.hasta)
      ctx.addIssue({
        code: 'custom',
        path: ['desde'],
        message: 'Selecciona fecha de inicio y fin',
      });
    if (q.desde && q.hasta) {
      const days = (Date.parse(q.hasta) - Date.parse(q.desde)) / 86400000;
      if (days < 0 || days > 365)
        ctx.addIssue({
          code: 'custom',
          path: ['hasta'],
          message: 'El periodo debe estar ordenado y no superar 366 días',
        });
    }
  });
export type ConsultaReporte = z.infer<typeof ConsultaReporteSchema>;
export type FormatoColumna =
  'texto' | 'dinero' | 'cantidad' | 'numero' | 'estado';
export interface ColumnaReporte {
  key: string;
  titulo: string;
  formato: FormatoColumna;
}
export interface MetricaReporte {
  key: string;
  titulo: string;
  formato: 'dinero' | 'numero';
  sql: string;
}
const text = (key: string, titulo: string): ColumnaReporte => ({
  key,
  titulo,
  formato: 'texto',
});
const money = (key: string, titulo: string): ColumnaReporte => ({
  key,
  titulo,
  formato: 'dinero',
});
const amount = (key: string, titulo: string): ColumnaReporte => ({
  key,
  titulo,
  formato: 'cantidad',
});
const metric = (
  key: string,
  titulo: string,
  sql: string,
  formato: 'dinero' | 'numero' = 'dinero',
): MetricaReporte => ({ key, titulo, formato, sql });

export const REPORTES: Record<
  TipoReporte,
  {
    titulo: string;
    descripcion: string;
    permiso: P;
    periodo: boolean;
    estados: string[];
    columnas: ColumnaReporte[];
    metricas: MetricaReporte[];
    orden: string;
  }
> = {
  ventas: {
    titulo: 'Ventas',
    descripcion:
      'Ventas del periodo con su cobro inicial y saldo originado. Los abonos posteriores se consultan en Cuentas por cobrar.',
    permiso: P.VENTAS_VER,
    periodo: true,
    estados: ['todos'],
    orden: 'id DESC',
    columnas: [
      text('numero', 'Venta'),
      text('fecha', 'Fecha'),
      text('cliente', 'Cliente'),
      text('vendedor', 'Vendedor'),
      money('importe', 'Total vendido'),
      money('cobrado', 'Cobro inicial'),
      money('pendiente', 'Saldo originado'),
    ],
    metricas: [
      metric('vendido', 'Total vendido', 'SUM(importe)'),
      metric('cobrado', 'Cobrado al vender', 'SUM(cobrado)'),
      metric('pendiente', 'Saldo originado', 'SUM(pendiente)'),
      metric('promedio', 'Venta promedio', 'AVG(importe)'),
    ],
  },
  productos: {
    titulo: 'Productos más vendidos',
    descripcion:
      'Ranking por importe vendido. Las cantidades conservan la unidad de cada producto; no se suman kilos con unidades.',
    permiso: P.VENTAS_VER,
    periodo: true,
    estados: ['todos'],
    orden: 'importe DESC, id ASC',
    columnas: [
      text('producto', 'Producto'),
      text('categoria', 'Categoría'),
      text('unidad', 'Unidad'),
      amount('cantidad', 'Cantidad vendida'),
      { key: 'ventas', titulo: 'Ventas', formato: 'numero' },
      money('importe', 'Importe vendido'),
    ],
    metricas: [
      metric('productos', 'Productos vendidos', 'COUNT(*)', 'numero'),
      metric('importe', 'Importe de productos', 'SUM(importe)'),
    ],
  },
  compras: {
    titulo: 'Compras por proveedor',
    descripcion:
      'Compras del periodo y su saldo actual. Pagos a proveedores y percepciones se reflejan por fecha de pago en Flujo de caja.',
    permiso: P.COMPRAS_VER,
    periodo: true,
    estados: ['todos'],
    orden: 'id DESC',
    columnas: [
      text('numero', 'Compra'),
      text('fecha', 'Fecha'),
      text('proveedor', 'Proveedor'),
      text('comprobante', 'Documento'),
      money('importe', 'Total comprado'),
      money('pagado', 'Pagado actual'),
      money('pendiente', 'Por pagar'),
    ],
    metricas: [
      metric('compras', 'Compras', 'COUNT(*)', 'numero'),
      metric('importe', 'Total comprado', 'SUM(importe)'),
      metric('pagado', 'Pagado actual', 'SUM(pagado)'),
      metric('pendiente', 'Por pagar', 'SUM(pendiente)'),
    ],
  },
  caja: {
    titulo: 'Flujo de caja',
    descripcion:
      'Cobros y desembolsos reales por día, incluyendo abonos y pagos de compras. El neto corresponde a movimientos del periodo, sin fondo de apertura.',
    permiso: P.CAJA_VER,
    periodo: true,
    estados: ['todos'],
    orden: 'dia DESC',
    columnas: [
      text('fecha', 'Día'),
      money('ventas', 'Cobros de ventas'),
      money('ingresos', 'Otros ingresos'),
      money('compras', 'Pagos de compras'),
      money('egresos', 'Otros egresos'),
      money('neto', 'Neto de movimientos'),
    ],
    metricas: [
      metric('entradas', 'Dinero recibido', 'SUM(ventas + ingresos)'),
      metric('salidas', 'Dinero entregado', 'SUM(compras + egresos)'),
      metric('neto', 'Neto del periodo', 'SUM(neto)'),
      metric('dias', 'Días con movimientos', 'COUNT(*)', 'numero'),
    ],
  },
  inventario: {
    titulo: 'Stock y reposición',
    descripcion:
      'Inventarios actuales de productos y áreas activas. Reponer indica la cantidad necesaria para alcanzar el stock mínimo configurado.',
    permiso: P.LOGISTICA_VER,
    periodo: false,
    estados: ['todos', 'critico', 'agotado'],
    orden: 'stock ASC, producto ASC, id ASC',
    columnas: [
      text('producto', 'Producto'),
      text('categoria', 'Categoría'),
      text('almacen', 'Área'),
      text('unidad', 'Unidad'),
      amount('stock', 'Stock actual'),
      amount('minimo', 'Mínimo'),
      amount('reponer', 'Reponer'),
      { key: 'estado', titulo: 'Estado', formato: 'estado' },
    ],
    metricas: [
      metric('registros', 'Inventarios', 'COUNT(*)', 'numero'),
      metric('agotados', 'Sin stock', 'SUM(stock <= 0)', 'numero'),
      metric(
        'criticos',
        'Stock bajo',
        'SUM(stock > 0 AND stock <= minimo)',
        'numero',
      ),
    ],
  },
  deudas: {
    titulo: 'Cuentas por cobrar',
    descripcion:
      'Saldos actuales de ventas con pago pendiente, descontando los abonos ya registrados. El vencimiento se evalúa con la fecha actual de Perú.',
    permiso: P.DEUDAS_VER,
    periodo: false,
    estados: ['todos', 'pendiente', 'vencida', 'pagada'],
    orden: 'saldo DESC, id ASC',
    columnas: [
      text('cliente', 'Cliente'),
      text('documento', 'Documento'),
      text('numero', 'Venta'),
      text('fecha', 'Fecha de venta'),
      text('vencimiento', 'Fecha de pago'),
      money('original', 'Deuda original'),
      money('abonado', 'Abonado'),
      money('saldo', 'Saldo actual'),
      { key: 'estado', titulo: 'Estado', formato: 'estado' },
    ],
    metricas: [
      metric('cuentas', 'Cuentas', 'COUNT(*)', 'numero'),
      metric('saldo', 'Por cobrar', 'SUM(saldo)'),
      metric(
        'vencido',
        'Saldo vencido',
        "SUM(CASE WHEN estado = 'Vencida' THEN saldo ELSE 0 END)",
      ),
      metric('abonado', 'Abonos recibidos', 'SUM(abonado)'),
    ],
  },
};
export type FilaReporte = Record<string, string | number | null>;
export interface ResultadoReporte {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  periodo: boolean;
  desde: string | null;
  hasta: string | null;
  sucursal: string;
  generadoEn: string;
  filtros: string;
  columnas: ColumnaReporte[];
  resumen: Array<{
    titulo: string;
    valor: string;
    formato: 'dinero' | 'numero';
  }>;
  data: FilaReporte[];
  total: number;
  pagina: number;
  limite: number;
}
