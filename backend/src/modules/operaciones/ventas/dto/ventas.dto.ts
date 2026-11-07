import { z } from 'zod';
import {
  cantidadPositiva,
  contieneDuplicados,
  decimalEscalado,
  dineroPositivo,
  FechaHoraSchema,
  FechaSchema,
  IdSchema,
  MAX_DETALLES,
  PagosOpcionalesSchema,
  precioPositivo,
  sumaPagos,
  textoOpcional,
} from '../../compartido/dto/operaciones-base.dto.js';

export const VentaProductoSchema = z
  .object({
    idProductoSucursal: IdSchema,
    idAlmacen: IdSchema,
    cantidad: cantidadPositiva,
    precioUnitario: precioPositivo,
  })
  .strict();

export const CreditoVentaSchema = z
  .object({
    idCliente: IdSchema,
    fechaVencimiento: FechaSchema.nullable().optional(),
  })
  .strict();

export const CrearVentaSchema = z
  .object({
    claveOperacion: z.uuid().optional(),
    efectivoRecibido: dineroPositivo.optional(),
    idCliente: IdSchema.nullable().optional(),
    idCaja: IdSchema,
    idSucursal: IdSchema,
    monto: dineroPositivo,
    detalle: textoOpcional('El detalle', 500),
    fechaIngreso: FechaHoraSchema.optional(),
    productos: z
      .array(VentaProductoSchema, {
        error: 'Los productos deben enviarse en una lista',
      })
      .min(1, 'La venta debe contener al menos un producto')
      .max(
        MAX_DETALLES,
        `La venta no puede contener más de ${MAX_DETALLES} productos`,
      )
      .superRefine((productos, ctx) => {
        if (
          contieneDuplicados(
            productos,
            (producto) =>
              `${producto.idProductoSucursal}:${producto.idAlmacen}`,
          )
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'No puede repetir el mismo producto y almacén',
          });
        }
      }),
    pagos: PagosOpcionalesSchema,
    credito: CreditoVentaSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const pagado = sumaPagos(value.pagos);
    const total = decimalEscalado(value.monto, 2);

    if (pagado > total) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos no puede superar el total de la venta',
      });
    } else if (pagado < total && !value.credito) {
      ctx.addIssue({
        code: 'custom',
        path: ['credito'],
        message:
          'Debe indicar el cliente cuando la venta deja un saldo a crédito',
      });
    }
  });

export type CrearVentaDto = z.infer<typeof CrearVentaSchema>;
