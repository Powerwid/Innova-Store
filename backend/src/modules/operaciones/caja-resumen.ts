import { Prisma } from '../../generated/prisma/client.js';
import {
  MEDIO_PAGO_EFECTIVO,
  MOTIVO_INGRESO_VENTA,
  MOTIVO_EGRESO_CREDITO_CLIENTE,
} from './operaciones.constants.js';

type Monto = string | number | Prisma.Decimal;
interface Pago {
  idMedioPago: number;
  monto: Monto;
  medioPago: { nombre: string };
}
interface IngresoResumen {
  idMotivoIngreso: number;
  monto: Monto;
  pagos: Pago[];
}
interface EgresoResumen {
  idMotivoEgreso: number;
  idCompra: number | null;
  pagos: Pago[];
}
interface CajaResumen {
  montoApertura: Monto;
  detalles: Pago[];
}

// El saldo se obtiene de los pagos históricos, no del total comercial de una venta.
export function calcularResumenCaja(
  caja: CajaResumen,
  ingresos: IngresoResumen[],
  egresos: EgresoResumen[],
) {
  const cero = () => new Prisma.Decimal(0);
  const medios = new Map<
    number,
    {
      idMedioPago: number;
      nombre: string;
      apertura: Prisma.Decimal;
      ventas: Prisma.Decimal;
      ingresos: Prisma.Decimal;
      egresos: Prisma.Decimal;
      compras: Prisma.Decimal;
      saldo: Prisma.Decimal;
    }
  >();
  function medio(pago: Pago) {
    let row = medios.get(pago.idMedioPago);
    if (!row) {
      row = {
        idMedioPago: pago.idMedioPago,
        nombre: pago.medioPago.nombre,
        apertura: cero(),
        ventas: cero(),
        ingresos: cero(),
        egresos: cero(),
        compras: cero(),
        saldo: cero(),
      };
      medios.set(pago.idMedioPago, row);
    }
    return row;
  }
  for (const detalle of caja.detalles) {
    const row = medio(detalle);
    row.saldo = new Prisma.Decimal(detalle.monto);
    if (row.nombre.trim().toLowerCase() === MEDIO_PAGO_EFECTIVO.toLowerCase())
      row.apertura = new Prisma.Decimal(caja.montoApertura);
  }
  let totalVentas = cero();
  const cantidades = { ventas: 0, ingresos: 0, egresos: 0, compras: 0 };
  const compras = new Set<number>();
  for (const ingreso of ingresos) {
    const venta = ingreso.idMotivoIngreso === MOTIVO_INGRESO_VENTA;
    cantidades[venta ? 'ventas' : 'ingresos']++;
    if (venta) totalVentas = totalVentas.plus(ingreso.monto);
    for (const pago of ingreso.pagos) {
      const row = medio(pago),
        columna = venta ? 'ventas' : 'ingresos';
      row[columna] = row[columna].plus(pago.monto);
    }
  }
  for (const egreso of egresos) {
    // El egreso compensatorio de crédito no entrega dinero.
    if (egreso.idMotivoEgreso === MOTIVO_EGRESO_CREDITO_CLIENTE) continue;
    const compra = egreso.idCompra !== null;
    if (compra) compras.add(egreso.idCompra!);
    else cantidades.egresos++;
    for (const pago of egreso.pagos) {
      const row = medio(pago),
        columna = compra ? 'compras' : 'egresos';
      row[columna] = row[columna].plus(pago.monto);
    }
  }
  cantidades.compras = compras.size;
  const sum = (
    columna: 'ventas' | 'ingresos' | 'egresos' | 'compras' | 'saldo',
  ) =>
    [...medios.values()].reduce(
      (total, row) => total.plus(row[columna]),
      cero(),
    );
  const cobrosVentas = sum('ventas'),
    otrosIngresos = sum('ingresos'),
    gastos = sum('egresos'),
    pagosCompras = sum('compras');
  const saldoCalculado = new Prisma.Decimal(caja.montoApertura)
    .plus(cobrosVentas)
    .plus(otrosIngresos)
    .minus(gastos)
    .minus(pagosCompras);
  const saldoRegistrado = sum('saldo');
  const mediosPago = [...medios.values()]
    .map((row) => {
      const neto = row.ventas
        .plus(row.ingresos)
        .minus(row.egresos)
        .minus(row.compras);
      return {
        idMedioPago: row.idMedioPago,
        nombre: row.nombre,
        apertura: row.apertura.toFixed(2),
        ventas: row.ventas.toFixed(2),
        ingresos: row.ingresos.toFixed(2),
        egresos: row.egresos.toFixed(2),
        compras: row.compras.toFixed(2),
        neto: neto.toFixed(2),
        saldo: row.saldo.toFixed(2),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return {
    apertura: new Prisma.Decimal(caja.montoApertura).toFixed(2),
    totalVentas: totalVentas.toFixed(2),
    cobrosVentas: cobrosVentas.toFixed(2),
    creditoOriginado: totalVentas.minus(cobrosVentas).toFixed(2),
    ingresos: otrosIngresos.toFixed(2),
    egresos: gastos.toFixed(2),
    compras: pagosCompras.toFixed(2),
    salidas: gastos.plus(pagosCompras).toFixed(2),
    saldoCalculado: saldoCalculado.toFixed(2),
    saldoRegistrado: saldoRegistrado.toFixed(2),
    diferencia: saldoRegistrado.minus(saldoCalculado).toFixed(2),
    efectivoEsperado:
      mediosPago.find(
        (row) =>
          row.nombre.trim().toLowerCase() === MEDIO_PAGO_EFECTIVO.toLowerCase(),
      )?.saldo ?? '0.00',
    cantidades,
    mediosPago,
  };
}
