import { z } from 'zod';
import {
  DineroSchema,
  FechaHoraSchema,
  FechaSchema,
  IdSchema,
  ListarOperacionesSchema,
  MAX_DETALLES,
  PaginacionSchema,
  PagosOpcionalesSchema,
  PagosSchema,
  cantidadPositiva,
  contieneDuplicados,
  decimalEscalado,
  dineroPositivo,
  filtrosSucursalFecha,
  porcentajePositivo,
  precioPositivo,
  queryId,
  sumaPagos,
  textoOpcional,
  textoRequerido,
  validarRango,
} from '../../compartido/dto/operaciones-base.dto.js';

export const ListarComprasSchema = ListarOperacionesSchema.safeExtend({
  idProveedor: queryId,
  idAlmacen: queryId,
});

export const ListarPercepcionesSchema = PaginacionSchema.extend({
  idSucursal: queryId,
  idProveedor: queryId,
  idCompra: queryId,
  buscar: filtrosSucursalFecha.buscar,
  desde: FechaSchema.optional(),
  hasta: FechaSchema.optional(),
}).refine(validarRango, {
  path: ['hasta'],
  message: 'La fecha final no puede ser anterior a la fecha inicial',
});

export const CompraDetalleSchema = z
  .object({
    idProductoSucursal: IdSchema,
    cantidad: cantidadPositiva,
    precioUnitario: precioPositivo,
  })
  .strict();

export const ComprobanteCompraSchema = z
  .object({
    idTipoComprobante: IdSchema,
    serie: textoOpcional('La serie', 20),
    numero: textoOpcional('El número', 40),
    fechaEmision: FechaSchema,
  })
  .strict();

export const percepcionBase = {
  fechaPercepcion: FechaSchema,
  baseCalculo: dineroPositivo,
  porcentaje: porcentajePositivo,
  monto: dineroPositivo,
  numeroConstancia: textoOpcional('El número de constancia', 80),
  pagos: PagosSchema,
};

export const PercepcionCompraSchema = z
  .object(percepcionBase)
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message:
          'La suma de los pagos debe coincidir con el monto de la percepción',
      });
    }
  });

export const CrearPercepcionSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    ...percepcionBase,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message:
          'La suma de los pagos debe coincidir con el monto de la percepción',
      });
    }
  });

export const CrearCompraSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    idAlmacen: IdSchema,
    idProveedor: IdSchema.nullable().optional(),
    nombreProveedor: textoRequerido('El nombre del proveedor', 255),
    fechaCompra: FechaHoraSchema.optional(),
    subtotal: DineroSchema.nullable().optional(),
    igv: DineroSchema.nullable().optional(),
    total: dineroPositivo,
    detalles: z
      .array(CompraDetalleSchema, {
        error: 'Los detalles deben enviarse en una lista',
      })
      .min(1, 'La compra debe contener al menos un producto')
      .max(
        MAX_DETALLES,
        `La compra no puede contener más de ${MAX_DETALLES} productos`,
      )
      .superRefine((detalles, ctx) => {
        if (
          contieneDuplicados(detalles, (detalle) => detalle.idProductoSucursal)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'No puede repetir un producto en la compra',
          });
        }
      }),
    comprobante: ComprobanteCompraSchema.nullable().optional(),
    pagos: PagosOpcionalesSchema,
    percepcion: PercepcionCompraSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const subtotalInformado = value.subtotal != null;
    const igvInformado = value.igv != null;
    if (subtotalInformado !== igvInformado) {
      ctx.addIssue({
        code: 'custom',
        path: [subtotalInformado ? 'igv' : 'subtotal'],
        message: 'El subtotal y el IGV deben informarse juntos',
      });
    } else if (
      subtotalInformado &&
      igvInformado &&
      decimalEscalado(value.subtotal!, 2) + decimalEscalado(value.igv!, 2) !==
        decimalEscalado(value.total, 2)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'El total debe ser igual al subtotal más el IGV',
      });
    }

    if (sumaPagos(value.pagos) > decimalEscalado(value.total, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos no puede superar el total de la compra',
      });
    }
  });

export const PagoCompraSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    monto: dineroPositivo.optional(),
    detalle: textoOpcional('El detalle', 500),
    fechaEgreso: FechaHoraSchema.optional(),
    pagos: PagosSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.monto !== undefined &&
      sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos debe coincidir con el monto pagado',
      });
    }
  });

export type ListarComprasDto = z.infer<typeof ListarComprasSchema>;

export type CrearCompraDto = z.infer<typeof CrearCompraSchema>;

export type PagoCompraDto = z.infer<typeof PagoCompraSchema>;

export type CrearPercepcionDto = z.infer<typeof CrearPercepcionSchema>;
