import { describe, expect, it, vi } from 'vitest';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import type { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { definirTicketPdf, TicketPdfService } from './ticket-pdf.service.js';
import {
  construirTicketVenta,
  validarEfectivoTicket,
  type VentaParaTicket,
} from './ticket-venta.js';
import { VentasService } from './ventas.service.js';

const venta: VentaParaTicket = {
  idIngreso: 42,
  monto: '18.00',
  fechaIngreso: new Date('2026-10-08T17:30:00Z'),
  detalle: 'Compra de prueba',
  sucursal: { nombre: 'Sucursal Principal' },
  usuario: {
    correo: 'caja@example.test',
    perfil: { nombres: 'Ana', apellidos: 'Prueba' },
  },
  cliente: {
    nombre: 'Clientes varios',
    numeroDocumento: 'VARIOS',
    esGenerico: true,
  },
  productos: [
    {
      cantidad: '2.000',
      precioUnitario: '9.0000',
      productoSucursal: {
        producto: { nombre: 'Arroz', unidadMedida: { simbolo: 'KG' } },
      },
    },
  ],
  pagos: [
    { monto: '6.00', medioPago: { nombre: 'Efectivo' } },
    { monto: '12.00', medioPago: { nombre: 'Yape' } },
  ],
};

describe('Ticket de venta', () => {
  it('desglosa el precio con IGV incluido y separa el vuelto del pago aplicado', () => {
    const ticket = construirTicketVenta(
      venta,
      { igv: '18.00', nombreComercial: 'Innova Store' },
      '10.00',
    );
    expect(ticket).toMatchObject({
      numero: 'V-00000042',
      subtotal: '15.25',
      igv: '2.75',
      total: '18.00',
      pagado: '18.00',
      pendiente: '0.00',
      efectivoRecibido: '10.00',
      vuelto: '4.00',
      cliente: { nombre: 'Clientes varios', documento: null },
      atendidoPor: 'Ana Prueba',
    });
    expect(ticket.pagos.map((p) => p.monto)).toEqual(['6.00', '12.00']);
  });

  it('conserva cantidades por peso y precios con cuatro decimales', () => {
    const ticket = construirTicketVenta(
      {
        ...venta,
        monto: '1.31',
        pagos: [],
        productos: [
          {
            ...venta.productos[0],
            cantidad: '0.375',
            precioUnitario: '3.5001',
          },
        ],
      },
      { igv: '0.00' },
    );
    expect(ticket.productos[0]).toMatchObject({
      cantidad: '0.375',
      precioUnitario: '3.5001',
      total: '1.31',
      unidad: 'KG',
    });
    expect(ticket).toMatchObject({
      subtotal: '1.31',
      igv: '0.00',
      efectivoRecibido: null,
      vuelto: null,
    });
  });

  it('imprime el saldo original y el vencimiento de una venta con pago pendiente', () => {
    const cliente = {
      nombre: 'Luis Prueba',
      numeroDocumento: '12345678',
      tipoDocumento: { nombre: 'DNI' },
    };
    const ticket = construirTicketVenta(
      {
        ...venta,
        cliente,
        pagos: [{ monto: '6.00', medioPago: { nombre: 'Efectivo' } }],
        deudaOriginada: {
          cliente,
          egreso: { monto: '12.00' },
          fechaVencimiento: new Date('2026-10-20T00:00:00Z'),
        },
      },
      { igv: '18.00' },
      '10.00',
    );
    expect(ticket).toMatchObject({
      pendiente: '12.00',
      vencimiento: '2026-10-20',
      cliente: { documento: 'DNI 12345678' },
      vuelto: '4.00',
    });
  });

  it('rechaza efectivo insuficiente o recibido sin pagos en efectivo', () => {
    expect(() => validarEfectivoTicket('5.99', new Prisma.Decimal(6))).toThrow(
      'debe cubrir',
    );
    expect(() => validarEfectivoTicket('10', new Prisma.Decimal(0))).toThrow(
      'solo corresponde',
    );
  });

  it('reimprime la copia histórica sin consultar los nombres o el IGV actuales', async () => {
    const ticketDatos = construirTicketVenta(venta, { igv: '18.00' }, '10.00');
    const obtenerVenta = vi.fn().mockResolvedValue({
      ...venta,
      ticketDatos,
      cliente: { nombre: 'Cliente editado' },
    });
    const findUnique = vi.fn();
    const service = new TicketPdfService(
      { obtenerVenta } as unknown as VentasService,
      { sucursalPerfil: { findUnique } } as unknown as PrismaService,
    );
    const actor = {} as UsuarioAutenticado;
    const { buffer, filename } = await service.generar(42, actor);
    expect(obtenerVenta).toHaveBeenCalledWith(42, actor);
    expect(findUnique).not.toHaveBeenCalled();
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(filename).toBe('ticket-V-00000042.pdf');
    const definition = definirTicketPdf(ticketDatos);
    expect(definition.pageSize).toEqual({
      width: (80 * 72) / 25.4,
      height: 'auto',
    });
    expect(JSON.stringify(definition.content)).toContain('Clientes varios');
    expect(JSON.stringify(definition.content)).not.toContain('Cliente editado');
  });
});
