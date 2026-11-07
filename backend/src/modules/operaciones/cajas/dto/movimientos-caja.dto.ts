import { z } from 'zod';
import {
  decimalEscalado,
  dineroPositivo,
  FechaHoraSchema,
  IdSchema,
  ListarOperacionesSchema,
  PagosSchema,
  queryId,
  sumaPagos,
  textoOpcional,
} from '../../compartido/dto/operaciones-base.dto.js';

export const ListarIngresosSchema = ListarOperacionesSchema.safeExtend({
  idCaja: queryId,
  idMotivoIngreso: queryId,
});

export const ListarEgresosSchema = ListarOperacionesSchema.safeExtend({
  idCaja: queryId,
  idMotivoEgreso: queryId,
  idCompra: queryId,
});

export const CrearIngresoSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    idMotivoIngreso: IdSchema,
    monto: dineroPositivo,
    detalle: textoOpcional('El detalle', 500),
    fechaIngreso: FechaHoraSchema.optional(),
    pagos: PagosSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos debe coincidir con el monto del ingreso',
      });
    }
  });

export const CrearEgresoSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
    idMotivoEgreso: IdSchema,
    monto: dineroPositivo,
    detalle: textoOpcional('El detalle', 500),
    fechaEgreso: FechaHoraSchema.optional(),
    pagos: PagosSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (sumaPagos(value.pagos) !== decimalEscalado(value.monto, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pagos'],
        message: 'La suma de los pagos debe coincidir con el monto del egreso',
      });
    }
  });

export type ListarIngresosDto = z.infer<typeof ListarIngresosSchema>;

export type ListarEgresosDto = z.infer<typeof ListarEgresosSchema>;

export type CrearIngresoDto = z.infer<typeof CrearIngresoSchema>;

export type CrearEgresoDto = z.infer<typeof CrearEgresoSchema>;
