import { describe, expect, it } from 'vitest';
import {
  AbrirCajaSchema,
  ActualizarMotivoEgresoSchema,
  ActualizarMotivoIngresoSchema,
  ActualizarTipoComprobanteSchema,
  CajaAbiertaQuerySchema,
  CantidadSchema,
  CerrarCajaSchema,
  CrearAbonoDeudaSchema,
  CrearCompraSchema,
  CrearEgresoSchema,
  CrearIngresoSchema,
  CrearPercepcionSchema,
  CrearVentaSchema,
  DineroSchema,
  FechaHoraSchema,
  FechaSchema,
  ListarCajasSchema,
  ListarOperacionesSchema,
  ListarTiposComprobanteSchema,
  MotivoEgresoSchema,
  MotivoIngresoSchema,
  PagoCompraSchema,
  PagosSchema,
  PorcentajeSchema,
  PrecioUnitarioSchema,
  TipoComprobanteSchema,
} from './operaciones.dto.js';

const pago = (idMedioPago: number, monto: string) => ({
  idMedioPago,
  monto,
});

describe('DTO de operaciones', () => {
  it('respeta exactamente la precisión de cada decimal', () => {
    expect(DineroSchema.parse('999999999999.99')).toBe('999999999999.99');
    expect(PrecioUnitarioSchema.parse('9999999999.9999')).toBe(
      '9999999999.9999',
    );
    expect(CantidadSchema.parse('99999999999.999')).toBe('99999999999.999');
    expect(PorcentajeSchema.parse('100.000')).toBe('100.000');

    for (const value of [
      '-1',
      '1000000000000.00',
      '1.001',
      '1,50',
      'Infinity',
      true,
      null,
    ]) {
      expect(DineroSchema.safeParse(value).success).toBe(false);
    }
    expect(PrecioUnitarioSchema.safeParse('1.00001').success).toBe(false);
    expect(CantidadSchema.safeParse('1.0001').success).toBe(false);
    expect(PorcentajeSchema.safeParse('100.001').success).toBe(false);
  });

  it('exige fechas DATE o fecha-hora ISO con zona según corresponda', () => {
    expect(FechaSchema.safeParse('2026-02-28').success).toBe(true);
    expect(FechaSchema.safeParse('2026-02-30').success).toBe(false);
    expect(FechaHoraSchema.safeParse('2026-09-28T11:00:00-05:00').success).toBe(
      true,
    );
    expect(FechaHoraSchema.safeParse('2026-09-28T11:00:00').success).toBe(
      false,
    );
    expect(FechaSchema.safeParse('28/09/2026').success).toBe(false);
  });

  it('pagina, convierte filtros y rechaza rangos invertidos o campos ajenos', () => {
    expect(
      ListarCajasSchema.parse({
        pagina: '2',
        limite: '25',
        idSucursal: '8',
        abierta: 'false',
      }),
    ).toMatchObject({
      pagina: 2,
      limite: 25,
      idSucursal: 8,
      abierta: false,
    });

    expect(
      ListarOperacionesSchema.safeParse({
        desde: '2026-09-29T00:00:00-05:00',
        hasta: '2026-09-28T23:59:59-05:00',
      }).success,
    ).toBe(false);
    expect(
      ListarOperacionesSchema.safeParse({ campoDesconocido: true }).success,
    ).toBe(false);
    expect(CajaAbiertaQuerySchema.parse({ idSucursal: '8' })).toEqual({
      idSucursal: 8,
    });
    expect(CajaAbiertaQuerySchema.safeParse({}).success).toBe(false);
    expect(
      ListarTiposComprobanteSchema.safeParse({ activo: 'true' }).success,
    ).toBe(false);
  });

  it('valida apertura, cierre y saldos por medios sin errores de coma flotante', () => {
    expect(
      AbrirCajaSchema.parse({
        idSucursal: 1,
        montoApertura: '0.30',
        detalles: [pago(1, '0.10'), pago(2, '0.20')],
      }).montoApertura,
    ).toBe('0.30');
    expect(
      AbrirCajaSchema.safeParse({
        idSucursal: 1,
        montoApertura: '10',
        detalles: [pago(1, '9.99')],
      }).success,
    ).toBe(false);
    expect(PagosSchema.safeParse([pago(1, '5'), pago(1, '5')]).success).toBe(
      false,
    );
    expect(CerrarCajaSchema.safeParse({ montoCierre: '0' }).success).toBe(true);
    expect(
      CerrarCajaSchema.safeParse({ montoCierre: '0', comentario: 'extra' })
        .success,
    ).toBe(false);
  });

  it('crea y actualiza catálogos con cuerpos estrictos', () => {
    expect(MotivoIngresoSchema.parse({ motivo: 'Venta' })).toEqual({
      motivo: 'Venta',
      activo: true,
    });
    expect(
      MotivoEgresoSchema.parse({ motivo: 'Compra', activo: false }),
    ).toEqual({ motivo: 'Compra', activo: false });
    expect(ActualizarMotivoIngresoSchema.safeParse({}).success).toBe(false);
    expect(ActualizarMotivoEgresoSchema.parse({ activo: false })).toEqual({
      activo: false,
    });
    expect(
      TipoComprobanteSchema.parse({ nombre: 'Factura', codigoSunat: '01' }),
    ).toEqual({ nombre: 'Factura', codigoSunat: '01' });
    expect(
      TipoComprobanteSchema.safeParse({ nombre: 'Factura', codigoSunat: '1' })
        .success,
    ).toBe(false);
    expect(
      ActualizarTipoComprobanteSchema.parse({ codigoSunat: null }),
    ).toEqual({ codigoSunat: null });
    expect(ActualizarTipoComprobanteSchema.safeParse({}).success).toBe(false);
  });

  it('exige que los pagos cubran exactamente ingresos y egresos genéricos', () => {
    const base = {
      idCaja: 1,
      idSucursal: 1,
      monto: '25.50',
      detalle: 'Movimiento manual',
      pagos: [pago(1, '20'), pago(2, '5.50')],
    };

    expect(
      CrearIngresoSchema.safeParse({ ...base, idMotivoIngreso: 3 }).success,
    ).toBe(true);
    expect(
      CrearEgresoSchema.safeParse({ ...base, idMotivoEgreso: 4 }).success,
    ).toBe(true);
    expect(
      CrearIngresoSchema.safeParse({
        ...base,
        idMotivoIngreso: 3,
        pagos: [pago(1, '25.49')],
      }).success,
    ).toBe(false);
  });

  it('acepta contado o crédito identificado y valida productos de una venta', () => {
    const venta = {
      idCaja: 1,
      idSucursal: 2,
      monto: '100',
      productos: [
        {
          idProductoSucursal: 10,
          idAlmacen: 3,
          cantidad: '2.500',
          precioUnitario: '40.0000',
        },
      ],
      pagos: [pago(1, '40')],
      credito: { idCliente: 7, fechaVencimiento: '2026-10-31' },
    };

    expect(CrearVentaSchema.safeParse(venta).success).toBe(true);
    expect(
      CrearVentaSchema.safeParse({ ...venta, credito: undefined }).success,
    ).toBe(false);
    expect(
      CrearVentaSchema.safeParse({
        ...venta,
        productos: [...venta.productos, venta.productos[0]],
      }).success,
    ).toBe(false);
    expect(
      CrearVentaSchema.safeParse({
        ...venta,
        pagos: [pago(1, '100.01')],
      }).success,
    ).toBe(false);
    expect(
      CrearVentaSchema.safeParse({ ...venta, idMotivoIngreso: 1 }).success,
    ).toBe(false);
  });

  it('acepta una compra pendiente, parcial o con percepción y comprobante', () => {
    const compra = {
      idCaja: 1,
      idSucursal: 2,
      idAlmacen: 4,
      idProveedor: 8,
      nombreProveedor: 'Distribuidora del Sur SAC',
      fechaCompra: '2026-09-28T11:00:00-05:00',
      subtotal: '80',
      igv: '20',
      total: '100',
      detalles: [
        {
          idProductoSucursal: 10,
          cantidad: '2.500',
          precioUnitario: '40',
        },
      ],
      comprobante: {
        idTipoComprobante: 1,
        serie: 'F001',
        numero: '1234',
        fechaEmision: '2026-09-28',
      },
      pagos: [pago(1, '40')],
      percepcion: {
        fechaPercepcion: '2026-09-28',
        baseCalculo: '100',
        porcentaje: '2',
        monto: '2',
        numeroConstancia: 'P-123',
        pagos: [pago(1, '2')],
      },
    };

    expect(CrearCompraSchema.safeParse(compra).success).toBe(true);
    expect(
      CrearCompraSchema.safeParse({ ...compra, pagos: [], percepcion: null })
        .success,
    ).toBe(true);
    expect(
      CrearCompraSchema.safeParse({ ...compra, total: '99.99' }).success,
    ).toBe(false);
    expect(
      CrearCompraSchema.safeParse({
        ...compra,
        detalles: [...compra.detalles, compra.detalles[0]],
      }).success,
    ).toBe(false);
    expect(
      CrearCompraSchema.safeParse({ ...compra, idMotivoEgreso: 1 }).success,
    ).toBe(false);
  });

  it('valida pagos posteriores, percepciones y abonos sin motivos expuestos', () => {
    const pagoCompra = {
      idCaja: 1,
      idSucursal: 2,
      pagos: [pago(1, '30'), pago(2, '20')],
    };
    expect(PagoCompraSchema.safeParse(pagoCompra).success).toBe(true);
    expect(
      PagoCompraSchema.safeParse({ ...pagoCompra, monto: '50' }).success,
    ).toBe(true);
    expect(
      PagoCompraSchema.safeParse({ ...pagoCompra, monto: '49.99' }).success,
    ).toBe(false);

    expect(
      CrearPercepcionSchema.safeParse({
        idCaja: 1,
        idSucursal: 2,
        fechaPercepcion: '2026-09-28',
        baseCalculo: '100',
        porcentaje: '2',
        monto: '2',
        pagos: [pago(1, '2')],
      }).success,
    ).toBe(true);

    const abono = {
      idCaja: 1,
      idSucursal: 2,
      monto: '50',
      pagos: [pago(1, '50')],
    };
    expect(CrearAbonoDeudaSchema.safeParse(abono).success).toBe(true);
    expect(
      CrearAbonoDeudaSchema.safeParse({ ...abono, idMotivoIngreso: 2 }).success,
    ).toBe(false);
  });
});
