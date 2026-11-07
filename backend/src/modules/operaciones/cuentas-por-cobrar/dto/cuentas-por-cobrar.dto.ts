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

export const ListarDeudasSchema = ListarOperacionesSchema.safeExtend({
  idCliente: queryId,
  estado: z
    .enum(['PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA'], {
      error: 'El estado de la deuda no es válido',
    })
    .optional(),
});

export const CrearAbonoDeudaSchema = z
  .object({
    idCaja: IdSchema,
    idSucursal: IdSchema,
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
        message: 'La suma de los pagos debe coincidir con el monto del abono',
      });
    }
  });

export type ListarDeudasDto = z.infer<typeof ListarDeudasSchema>;

export type CrearAbonoDeudaDto = z.infer<typeof CrearAbonoDeudaSchema>;
