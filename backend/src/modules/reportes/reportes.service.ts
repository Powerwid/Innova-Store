import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import {
  REPORTES,
  type ConsultaReporte,
  type ResultadoReporte,
  type TipoReporte,
  type FilaReporte,
} from './reportes.definition.js';

export const MAX_EXPORT_ROWS = 20000;
export function fechaPeru(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function periodoPeru(desde: string, hasta: string) {
  return {
    inicio: new Date(`${desde}T00:00:00-05:00`),
    fin: new Date(Date.parse(`${hasta}T00:00:00-05:00`) + 86400000),
  };
}
const zero = Prisma.sql`0`;
const like = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;
type RawRow = Record<
  string,
  string | number | bigint | Prisma.Decimal | Date | null
>;

@Injectable()
export class ReportesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private autorizar(
    tipo: TipoReporte,
    q: ConsultaReporte,
    actor: UsuarioAutenticado,
  ) {
    const definition = REPORTES[tipo];
    if (
      actor.rol.nombre !== 'SUPERADMIN' &&
      !actor.permisos.includes(definition.permiso)
    )
      throw new ForbiddenException(
        'No tienes permiso para consultar este reporte',
      );
    if (q.idSucursal !== undefined && !actor.sucursales.includes(q.idSucursal))
      throw new ForbiddenException('No tienes acceso a esta sucursal');
    if (!definition.estados.includes(q.estado))
      throw new BadRequestException('Ese estado no corresponde al reporte');
    if (tipo === 'caja' && q.buscar)
      throw new BadRequestException(
        'Filtra el flujo de caja por sucursal y fechas',
      );
    if (definition.periodo && (!q.desde || !q.hasta))
      throw new BadRequestException('Selecciona fecha de inicio y fin');
    if (!definition.periodo && (q.desde || q.hasta))
      throw new BadRequestException(
        'Este reporte muestra el estado actual y no admite un periodo histórico',
      );
    return q.idSucursal !== undefined ? [q.idSucursal] : actor.sucursales;
  }

  private query(
    tipo: TipoReporte,
    q: ConsultaReporte,
    ids: number[],
  ): Prisma.Sql {
    // Los identificadores y órdenes SQL son constantes de este módulo. Los datos
    // del usuario, incluso los filtros de búsqueda, siempre se envían como parámetros.
    const scope = Prisma.join(ids.length ? ids : [-1]);
    const range = q.desde && q.hasta ? periodoPeru(q.desde, q.hasta) : null;
    const dateIncome = range
      ? Prisma.sql`AND i.fecha_ingreso >= ${range.inicio} AND i.fecha_ingreso < ${range.fin}`
      : Prisma.empty;
    const needle = like(q.buscar);
    if (tipo === 'ventas')
      return Prisma.sql`
      SELECT i.id_ingreso id, CONCAT('V-', LPAD(i.id_ingreso, 8, '0')) numero,
        DATE_FORMAT(DATE_SUB(i.fecha_ingreso, INTERVAL 5 HOUR), '%d/%m/%Y %H:%i') fecha,
        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.ticket_datos, '$.cliente.nombre')), cl.nombre, 'Clientes varios') cliente,
        COALESCE(NULLIF(CONCAT_WS(' ', up.nombres, up.apellidos), ''), u.correo) vendedor,
        i.monto importe, COALESCE(p.cobrado, 0) cobrado, i.monto - COALESCE(p.cobrado, 0) pendiente
      FROM ingresos i LEFT JOIN clientes cl ON cl.id_cliente = i.id_cliente
      JOIN usuarios u ON u.id_usuario = i.id_usuario LEFT JOIN usuarios_perfiles up ON up.id_usuario = u.id_usuario
      LEFT JOIN (SELECT id_ingreso, SUM(monto) cobrado FROM ingresos_detalle_pago GROUP BY id_ingreso) p ON p.id_ingreso = i.id_ingreso
      WHERE i.id_motivo_ingreso = 1 AND i.id_sucursal IN (${scope}) ${dateIncome}
        ${q.buscar ? Prisma.sql`AND (COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.ticket_datos, '$.cliente.nombre')), cl.nombre, 'Clientes varios') LIKE ${needle} OR cl.numero_documento LIKE ${needle} OR i.detalle LIKE ${needle} OR CONCAT('V-', LPAD(i.id_ingreso, 8, '0')) LIKE ${needle})` : Prisma.empty}`;
    if (tipo === 'productos')
      return Prisma.sql`
      SELECT p.id_producto id, p.nombre producto, c.nombre categoria, um.simbolo unidad,
        SUM(ip.cantidad) cantidad, COUNT(DISTINCT ip.id_ingreso) ventas, SUM(ip.cantidad * ip.precio_unitario) importe
      FROM ingresos_productos ip JOIN ingresos i ON i.id_ingreso = ip.id_ingreso
      JOIN producto_sucursal ps ON ps.id_producto_sucursal = ip.id_producto_sucursal
      JOIN productos p ON p.id_producto = ps.id_producto JOIN categorias c ON c.id_categoria = p.id_categoria
      JOIN unidades_medida um ON um.id_unidad_medida = p.id_unidad_medida
      WHERE i.id_motivo_ingreso = 1 AND i.id_sucursal IN (${scope}) ${dateIncome}
        ${q.buscar ? Prisma.sql`AND (p.nombre LIKE ${needle} OR c.nombre LIKE ${needle})` : Prisma.empty}
      GROUP BY p.id_producto, p.nombre, c.nombre, um.simbolo`;
    if (tipo === 'compras')
      return Prisma.sql`
      SELECT c.id_compra id, CONCAT('C-', LPAD(c.id_compra, 8, '0')) numero,
        DATE_FORMAT(DATE_SUB(c.fecha_compra, INTERVAL 5 HOUR), '%d/%m/%Y %H:%i') fecha,
        c.nombre_proveedor proveedor, COALESCE(NULLIF(CONCAT_WS(' ', tc.nombre, CONCAT_WS('-', cp.serie, cp.numero)), ''), 'Sin documento') comprobante,
        c.total importe, COALESCE(p.pagado, 0) pagado, c.total - COALESCE(p.pagado, 0) pendiente
      FROM compras c LEFT JOIN comprobantes cp ON cp.id_compra = c.id_compra
      LEFT JOIN tipos_comprobante tc ON tc.id_tipo_comprobante = cp.id_tipo_comprobante
      LEFT JOIN (SELECT id_compra, SUM(monto) pagado FROM egresos WHERE id_motivo_egreso = 1 GROUP BY id_compra) p ON p.id_compra = c.id_compra
      WHERE c.id_sucursal IN (${scope})
        ${range ? Prisma.sql`AND c.fecha_compra >= ${range.inicio} AND c.fecha_compra < ${range.fin}` : Prisma.empty}
        ${q.buscar ? Prisma.sql`AND c.nombre_proveedor LIKE ${needle}` : Prisma.empty}`;
    if (tipo === 'caja')
      return Prisma.sql`
      SELECT dia, DATE_FORMAT(dia, '%d/%m/%Y') fecha, SUM(ventas) ventas, SUM(ingresos) ingresos,
        SUM(compras) compras, SUM(egresos) egresos, SUM(ventas + ingresos - compras - egresos) neto
      FROM (
        SELECT DATE(DATE_SUB(i.fecha_ingreso, INTERVAL 5 HOUR)) dia,
          CASE WHEN i.id_motivo_ingreso = 1 THEN p.monto ELSE 0 END ventas,
          CASE WHEN i.id_motivo_ingreso <> 1 THEN p.monto ELSE 0 END ingresos, ${zero} compras, ${zero} egresos
        FROM ingresos i JOIN ingresos_detalle_pago p ON p.id_ingreso = i.id_ingreso
        WHERE i.id_sucursal IN (${scope}) ${dateIncome}
        UNION ALL
        SELECT DATE(DATE_SUB(e.fecha_egreso, INTERVAL 5 HOUR)) dia, 0 ventas, 0 ingresos,
          CASE WHEN e.id_compra IS NOT NULL THEN p.monto ELSE 0 END compras,
          CASE WHEN e.id_compra IS NULL THEN p.monto ELSE 0 END egresos
        FROM egresos e JOIN egresos_detalle_pago p ON p.id_egreso = e.id_egreso
        WHERE e.id_sucursal IN (${scope}) AND e.id_motivo_egreso <> 3
          ${range ? Prisma.sql`AND e.fecha_egreso >= ${range.inicio} AND e.fecha_egreso < ${range.fin}` : Prisma.empty}
      ) movimientos GROUP BY dia`;
    if (tipo === 'inventario')
      return Prisma.sql`
      SELECT iv.id_inventario id, p.nombre producto, c.nombre categoria, a.nombre almacen, um.simbolo unidad,
        iv.stock, iv.stock_minimo minimo, GREATEST(0, iv.stock_minimo - iv.stock) reponer,
        CASE WHEN iv.stock <= 0 THEN 'Agotado' WHEN iv.stock <= iv.stock_minimo THEN 'Stock bajo' ELSE 'Disponible' END estado
      FROM inventarios iv JOIN producto_sucursal ps ON ps.id_producto_sucursal = iv.id_producto_sucursal
      JOIN productos p ON p.id_producto = ps.id_producto JOIN categorias c ON c.id_categoria = p.id_categoria
      JOIN unidades_medida um ON um.id_unidad_medida = p.id_unidad_medida JOIN almacenes a ON a.id_almacen = iv.id_almacen
      WHERE iv.id_sucursal IN (${scope}) AND ps.estado = 1 AND p.estado = 1 AND a.estado = 1
        ${q.estado === 'critico' ? Prisma.sql`AND iv.stock <= iv.stock_minimo` : q.estado === 'agotado' ? Prisma.sql`AND iv.stock <= 0` : Prisma.empty}
        ${q.buscar ? Prisma.sql`AND (p.nombre LIKE ${needle} OR c.nombre LIKE ${needle} OR a.nombre LIKE ${needle})` : Prisma.empty}`;
    const debts = Prisma.sql`
      SELECT d.id_deuda_cliente id, cl.nombre cliente, cl.numero_documento documento,
        CONCAT('V-', LPAD(i.id_ingreso, 8, '0')) numero,
        DATE_FORMAT(DATE_SUB(i.fecha_ingreso, INTERVAL 5 HOUR), '%d/%m/%Y') fecha,
        COALESCE(DATE_FORMAT(d.fecha_vencimiento, '%d/%m/%Y'), 'Sin fecha') vencimiento,
        e.monto original, COALESCE(ab.abonado, 0) abonado, e.monto - COALESCE(ab.abonado, 0) saldo,
        CASE WHEN e.monto <= COALESCE(ab.abonado, 0) THEN 'Pagada'
          WHEN d.fecha_vencimiento < ${fechaPeru()} THEN 'Vencida' ELSE 'Pendiente' END estado
      FROM deudas_clientes d JOIN clientes cl ON cl.id_cliente = d.id_cliente JOIN ingresos i ON i.id_ingreso = d.id_ingreso_origen
      JOIN egresos e ON e.id_egreso = d.id_egreso
      LEFT JOIN (SELECT a.id_deuda_cliente, SUM(i.monto) abonado FROM abonos_deuda_cliente a JOIN ingresos i ON i.id_ingreso = a.id_ingreso_abono GROUP BY a.id_deuda_cliente) ab ON ab.id_deuda_cliente = d.id_deuda_cliente
      WHERE i.id_sucursal IN (${scope})
        ${q.buscar ? Prisma.sql`AND (cl.nombre LIKE ${needle} OR cl.numero_documento LIKE ${needle})` : Prisma.empty}`;
    return Prisma.sql`SELECT * FROM (${debts}) deudas ${q.estado === 'pendiente' ? Prisma.sql`WHERE saldo > 0` : q.estado === 'vencida' ? Prisma.sql`WHERE estado = 'Vencida'` : q.estado === 'pagada' ? Prisma.sql`WHERE estado = 'Pagada'` : Prisma.empty}`;
  }

  async obtener(
    tipo: TipoReporte,
    q: ConsultaReporte,
    actor: UsuarioAutenticado,
    exportar = false,
  ): Promise<ResultadoReporte> {
    const ids = this.autorizar(tipo, q, actor),
      definition = REPORTES[tipo],
      base = this.query(tipo, q, ids);
    const metricSql = Prisma.join(
      definition.metricas.map((m) =>
        Prisma.raw(`COALESCE(${m.sql}, 0) AS ${m.key}`),
      ),
    );
    const limite = exportar ? MAX_EXPORT_ROWS : q.limite;
    const { stats, rows } = await this.prisma.$transaction(
      async (tx) => {
        const [stats] = await tx.$queryRaw<RawRow[]>(
          Prisma.sql`SELECT COUNT(*) total, ${metricSql} FROM (${base}) reporte`,
        );
        if (exportar && Number(stats!.total) > MAX_EXPORT_ROWS)
          throw new BadRequestException(
            `El reporte supera ${MAX_EXPORT_ROWS} registros. Reduce el periodo o agrega un filtro para exportar.`,
          );
        const rows = await tx.$queryRaw<RawRow[]>(
          Prisma.sql`SELECT * FROM (${base}) reporte ORDER BY ${Prisma.raw(definition.orden)} LIMIT ${limite} OFFSET ${exportar ? 0 : (q.pagina - 1) * q.limite}`,
        );
        return { stats: stats!, rows };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const branch = q.idSucursal
      ? await this.prisma.sucursal.findUnique({
          where: { idSucursal: q.idSucursal },
          select: { nombre: true },
        })
      : null;
    const data: FilaReporte[] = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => {
          const column = definition.columnas.find((c) => c.key === key);
          if (value === null || value === undefined) return [key, null];
          if (column?.formato === 'dinero' || column?.formato === 'cantidad')
            return [
              key,
              new Prisma.Decimal(String(value)).toFixed(
                column.formato === 'dinero' ? 2 : 3,
                Prisma.Decimal.ROUND_HALF_UP,
              ),
            ];
          if (column?.formato === 'numero' || key === 'id')
            return [key, Number(value)];
          return [
            key,
            value instanceof Date ? value.toISOString() : String(value),
          ];
        }),
      ),
    );
    return {
      tipo,
      titulo: definition.titulo,
      descripcion: definition.descripcion,
      periodo: definition.periodo,
      desde: definition.periodo ? q.desde! : null,
      hasta: definition.periodo ? q.hasta! : null,
      sucursal: branch?.nombre ?? 'Todas mis sucursales',
      generadoEn: new Date().toISOString(),
      columnas: definition.columnas,
      filtros: [
        q.buscar ? `Búsqueda: ${q.buscar}` : '',
        q.estado !== 'todos'
          ? `Estado: ${{ critico: 'Stock bajo o agotado', agotado: 'Sin stock', pendiente: 'Con saldo pendiente', vencida: 'Vencida', pagada: 'Pagada' }[q.estado]}`
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
      resumen: definition.metricas.map((m) => ({
        titulo: m.titulo,
        formato: m.formato,
        valor: new Prisma.Decimal(String(stats[m.key])).toFixed(
          m.formato === 'dinero' ? 2 : 0,
          Prisma.Decimal.ROUND_HALF_UP,
        ),
      })),
      data,
      total: Number(stats.total),
      pagina: exportar ? 1 : q.pagina,
      limite,
    };
  }
}
