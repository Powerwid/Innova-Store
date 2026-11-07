import { Inject, Injectable } from '@nestjs/common';
import pdfmake from 'pdfmake';
import type { Content, CustomTableLayout, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { construirTicketVenta, TicketVentaSchema } from './ticket-venta.js';
import type { TicketVentaDatos } from './ticket-venta.js';
import { VentasService } from './ventas.service.js';

pdfmake.addFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});
const MM = 72 / 25.4,
  width = 80 * MM,
  margin = 4 * MM;
const money = (value: string) => `S/ ${value}`;
const precise = (value: string, minimum = 0) => {
  const [integer, fraction = ''] = value.split('.');
  const decimals = fraction.replace(/0+$/, '').padEnd(minimum, '0');
  return decimals ? `${integer}.${decimals}` : integer;
};
const noBorders: CustomTableLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 1,
  paddingBottom: () => 2,
};
const divider = (dotted = false): Content => ({
  canvas: [
    {
      type: 'line',
      x1: 0,
      y1: 0,
      x2: width - margin * 2,
      y2: 0,
      lineWidth: 0.7,
      lineColor: dotted ? '#777' : '#555',
      ...(dotted ? { dash: { length: 1, space: 1 } } : {}),
    },
  ],
  margin: [0, dotted ? 6 : 9, 0, 6],
});

// Adaptación del ticket-80mm.blade.php de Innova Restaurant.
export function definirTicketPdf(
  ticket: TicketVentaDatos,
): TDocumentDefinitions {
  const datos: Content[] = [
    {
      text: ticket.sucursal.nombre,
      alignment: 'center',
      bold: true,
      fontSize: 9,
    },
  ];
  for (const line of [
    ticket.sucursal.documento,
    ticket.sucursal.direccion,
    ticket.sucursal.telefono ? `Teléfono: ${ticket.sucursal.telefono}` : null,
  ]) {
    if (line)
      datos.push({ text: line, alignment: 'center', margin: [0, 2, 0, 0] });
  }
  datos.push(
    {
      text: 'TICKET DE VENTA',
      alignment: 'center',
      bold: true,
      fontSize: 11,
      margin: [0, 6, 0, 2],
    },
    { text: ticket.numero, alignment: 'center', bold: true, fontSize: 10 },
    divider(),
  );
  const details = [
    ['Atendido por:', ticket.atendidoPor],
    [
      'Fecha:',
      new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(ticket.fecha)),
    ],
    ['Cliente:', ticket.cliente.nombre],
    ...(ticket.cliente.documento
      ? [['Documento:', ticket.cliente.documento]]
      : []),
    ['Dirección:', ticket.cliente.direccion ?? '-'],
  ];
  datos.push(
    {
      table: {
        widths: [51, '*'],
        body: details.map(([label, value]) => [
          { text: label, bold: true },
          { text: value },
        ]),
      },
      layout: noBorders,
    },
    divider(true),
  );
  datos.push({
    table: {
      headerRows: 1,
      widths: [29, '*', 38, 42],
      body: [
        [
          { text: 'Cant.', bold: true },
          { text: 'Producto', bold: true },
          { text: 'P.U.', bold: true, alignment: 'right' },
          { text: 'P.T.', bold: true, alignment: 'right' },
        ],
        ...ticket.productos.map((p): TableCell[] => [
          { text: precise(p.cantidad) },
          { text: p.nombre + (p.unidad !== 'UND' ? ` (${p.unidad})` : '') },
          { text: precise(p.precioUnitario, 2), alignment: 'right' },
          { text: p.total, alignment: 'right', bold: true },
        ]),
      ],
    },
    layout: {
      ...noBorders,
      hLineWidth: (index) => (index === 1 ? 0.7 : 0),
      hLineColor: () => '#777',
      hLineStyle: () => ({ dash: { length: 1, space: 1 } }),
      paddingTop: () => 3,
      paddingBottom: () => 3,
      paddingRight: (index) => (index < 3 ? 3 : 0),
    },
  });
  datos.push(
    {
      table: {
        widths: ['*', 70],
        body: [
          [
            { text: 'Subtotal:', alignment: 'right', bold: true },
            { text: money(ticket.subtotal), alignment: 'right' },
          ],
          [
            {
              text: `IGV (${ticket.porcentajeIgv}%):`,
              alignment: 'right',
              bold: true,
            },
            { text: money(ticket.igv), alignment: 'right' },
          ],
          [
            { text: 'Total:', alignment: 'right', bold: true, fontSize: 10 },
            {
              text: money(ticket.total),
              alignment: 'right',
              bold: true,
              fontSize: 10,
            },
          ],
        ],
      },
      layout: noBorders,
      margin: [0, 4, 0, 0],
    },
    divider(),
    { text: 'Forma de pago:', bold: true },
  );
  for (const pago of ticket.pagos)
    datos.push({
      text: `${pago.medio}: ${money(pago.monto)}`,
      margin: [0, 2, 0, 0],
    });
  if (!ticket.pagos.length)
    datos.push({ text: 'Pago pendiente', margin: [0, 2, 0, 0] });
  if (ticket.efectivoRecibido !== null)
    datos.push({
      text: `Efectivo recibido: ${money(ticket.efectivoRecibido)}`,
      margin: [0, 2, 0, 0],
    });
  if (ticket.vuelto !== null)
    datos.push({
      text: `Vuelto: ${money(ticket.vuelto)}`,
      margin: [0, 2, 0, 0],
    });
  if (Number(ticket.pendiente) > 0) {
    datos.push({
      text: `Saldo pendiente: ${money(ticket.pendiente)}`,
      bold: true,
      margin: [0, 3, 0, 0],
    });
    if (ticket.vencimiento)
      datos.push({
        text: `Fecha de pago: ${ticket.vencimiento.split('-').reverse().join('/')}`,
        margin: [0, 2, 0, 0],
      });
  }
  datos.push(
    { text: 'Comentario:', bold: true, margin: [0, 8, 0, 2] },
    { text: ticket.comentario ?? '-' },
    {
      text: '¡Gracias por su compra!',
      alignment: 'center',
      fontSize: 9,
      margin: [0, 12, 0, 3],
    },
    { text: 'Documento interno', alignment: 'center', fontSize: 7 },
  );
  return {
    pageSize: { width, height: 'auto' },
    pageMargins: [margin, margin, margin, margin],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 7.5,
      lineHeight: 1.2,
      color: '#000',
    },
    info: {
      title: `Ticket ${ticket.numero}`,
      author: ticket.sucursal.nombre,
      subject: 'Ticket de venta',
    },
    content: datos,
  };
}

@Injectable()
export class TicketPdfService {
  constructor(
    @Inject(VentasService)
    private readonly ventas: VentasService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) { }
  async generar(id: number, actor: UsuarioAutenticado) {
    const venta = await this.ventas.obtenerVenta(id, actor);
    const ticket =
      venta.ticketDatos !== null
        ? TicketVentaSchema.parse(venta.ticketDatos)
        : construirTicketVenta(
          venta,
          await this.prisma.sucursalPerfil.findUnique({
            where: { idSucursal: venta.idSucursal },
            include: { tipoDocumento: true },
          }),
        );
    const buffer = await pdfmake
      .createPdf(definirTicketPdf(ticket))
      .getBuffer();
    return { buffer, filename: `ticket-${ticket.numero}.pdf` };
  }
}
