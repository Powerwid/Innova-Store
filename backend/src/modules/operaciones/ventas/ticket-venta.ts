import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from '../../../generated/prisma/client.js';

const texto = z.string();
export const TicketVentaSchema = z.object({
  version: z.literal(1),
  idVenta: z.number().int().positive(),
  numero: texto,
  sucursal: z.object({
    nombre: texto,
    documento: texto.nullable(),
    direccion: texto.nullable(),
    telefono: texto.nullable(),
  }),
  fecha: texto,
  atendidoPor: texto,
  cliente: z.object({
    nombre: texto,
    documento: texto.nullable(),
    direccion: texto.nullable(),
  }),
  productos: z
    .array(
      z.object({
        nombre: texto,
        unidad: texto,
        cantidad: texto,
        precioUnitario: texto,
        total: texto,
      }),
    )
    .min(1),
  subtotal: texto,
  porcentajeIgv: texto,
  igv: texto,
  total: texto,
  pagos: z.array(z.object({ medio: texto, monto: texto })),
  pagado: texto,
  pendiente: texto,
  efectivoRecibido: texto.nullable(),
  vuelto: texto.nullable(),
  vencimiento: texto.nullable(),
  comentario: texto.nullable(),
});
export type TicketVentaDatos = z.infer<typeof TicketVentaSchema>;
type DecimalValue = string | number | Prisma.Decimal;
type ClienteTicket = {
  nombre: string;
  numeroDocumento: string;
  esGenerico?: boolean;
  direccion?: string | null;
  tipoDocumento?: { nombre: string };
};
export interface VentaParaTicket {
  idIngreso: number;
  monto: DecimalValue;
  fechaIngreso: Date;
  detalle: string | null;
  sucursal: { nombre: string };
  usuario: {
    correo: string;
    perfil?: { nombres: string; apellidos: string } | null;
  };
  cliente?: ClienteTicket | null;
  productos: Array<{
    cantidad: DecimalValue;
    precioUnitario: DecimalValue;
    productoSucursal: {
      producto: { nombre: string; unidadMedida: { simbolo: string } };
    };
  }>;
  pagos: Array<{ monto: DecimalValue; medioPago: { nombre: string } }>;
  deudaOriginada?: {
    cliente?: ClienteTicket;
    egreso: { monto: DecimalValue };
    fechaVencimiento: Date | null;
  } | null;
}
export interface PerfilParaTicket {
  razonSocial?: string | null;
  nombreComercial?: string | null;
  numeroDocumento?: string | null;
  tipoDocumento?: { nombre: string } | null;
  direccionComercial?: string | null;
  direccionFiscal?: string | null;
  telefono?: string | null;
  igv: DecimalValue;
}
const decimal = (value: DecimalValue) => new Prisma.Decimal(value);
const dinero = (value: DecimalValue) =>
  decimal(value).toFixed(2, Prisma.Decimal.ROUND_HALF_UP);
const opcional = (value?: string | null) =>
  value?.trim() && value.trim() !== '-' ? value.trim() : null;

export function validarEfectivoTicket(
  recibido: string | undefined,
  efectivo: Prisma.Decimal,
) {
  if (recibido === undefined) return;
  if (efectivo.lte(0))
    throw new BadRequestException(
      'El efectivo recibido solo corresponde a pagos en efectivo',
    );
  if (decimal(recibido).lt(efectivo))
    throw new BadRequestException(
      'El efectivo recibido debe cubrir el importe aplicado',
    );
}

// Esta fotografía se guarda con la venta, antes de confirmar la transacción.
// Los cambios posteriores en productos, clientes o IGV no cambian una reimpresión.
export function construirTicketVenta(
  venta: VentaParaTicket,
  perfil: PerfilParaTicket | null,
  recibido?: string,
): TicketVentaDatos {
  const total = decimal(venta.monto),
    porcentaje = decimal(perfil?.igv ?? 0);
  const subtotal = total
    .div(porcentaje.div(100).plus(1))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const cliente = venta.cliente ?? venta.deudaOriginada?.cliente;
  const efectivo = venta.pagos
    .filter((p) => p.medioPago.nombre.trim().toLowerCase() === 'efectivo')
    .reduce((sum, p) => sum.plus(p.monto), decimal(0));
  const pagado = venta.pagos.reduce((sum, p) => sum.plus(p.monto), decimal(0));
  validarEfectivoTicket(recibido, efectivo);
  const nombreDocumento = perfil?.tipoDocumento?.nombre;
  return {
    version: 1,
    idVenta: venta.idIngreso,
    numero: `V-${String(venta.idIngreso).padStart(8, '0')}`,
    sucursal: {
      nombre:
        opcional(perfil?.razonSocial) ??
        opcional(perfil?.nombreComercial) ??
        venta.sucursal.nombre,
      documento: perfil?.numeroDocumento
        ? `${nombreDocumento ?? 'Documento'} ${perfil.numeroDocumento}`
        : null,
      direccion:
        opcional(perfil?.direccionComercial) ??
        opcional(perfil?.direccionFiscal),
      telefono: opcional(perfil?.telefono),
    },
    fecha: venta.fechaIngreso.toISOString(),
    atendidoPor: venta.usuario.perfil
      ? `${venta.usuario.perfil.nombres} ${venta.usuario.perfil.apellidos}`.trim()
      : venta.usuario.correo,
    cliente: {
      nombre: cliente?.nombre ?? 'Clientes varios',
      documento:
        cliente && !cliente.esGenerico
          ? `${cliente.tipoDocumento?.nombre ?? 'Documento'} ${cliente.numeroDocumento}`
          : null,
      direccion: opcional(cliente?.direccion),
    },
    productos: venta.productos.map((p) => ({
      nombre: p.productoSucursal.producto.nombre,
      unidad: p.productoSucursal.producto.unidadMedida.simbolo,
      cantidad: decimal(p.cantidad).toFixed(3),
      precioUnitario: decimal(p.precioUnitario).toFixed(4),
      total: dinero(decimal(p.cantidad).times(p.precioUnitario)),
    })),
    subtotal: dinero(subtotal),
    porcentajeIgv: porcentaje.toString(),
    igv: dinero(total.minus(subtotal)),
    total: dinero(total),
    pagos: venta.pagos.map((p) => ({
      medio: p.medioPago.nombre,
      monto: dinero(p.monto),
    })),
    pagado: dinero(pagado),
    pendiente: dinero(venta.deudaOriginada?.egreso.monto ?? 0),
    efectivoRecibido: recibido === undefined ? null : dinero(recibido),
    vuelto:
      recibido === undefined ? null : dinero(decimal(recibido).minus(efectivo)),
    vencimiento:
      venta.deudaOriginada?.fechaVencimiento?.toISOString().slice(0, 10) ??
      null,
    comentario: opcional(venta.detalle),
  };
}
