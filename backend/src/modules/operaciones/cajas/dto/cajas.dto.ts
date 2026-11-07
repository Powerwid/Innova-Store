import { z } from 'zod';
import {
  DineroSchema,
  FechaHoraSchema,
  IdSchema,
  MAX_ID,
  PaginacionSchema,
  queryId,
  validarRango,
} from '../../compartido/dto/operaciones-base.dto.js';

export const ListarCajasSchema = PaginacionSchema.extend({
  idSucursal: queryId,
  desde: FechaHoraSchema.optional(),
  hasta: FechaHoraSchema.optional(),
  abierta: z
    .enum(['true', 'false'], {
      error: 'El estado de caja debe ser true o false',
    })
    .transform((value) => value === 'true')
    .optional(),
}).superRefine((value, ctx) => {
  if (!validarRango(value)) {
    ctx.addIssue({
      code: 'custom',
      path: ['hasta'],
      message: 'La fecha final no puede ser anterior a la fecha inicial',
    });
  }
});

export const CajaAbiertaQuerySchema = z
  .object({
    idSucursal: z.coerce
      .number({ error: 'La sucursal debe ser un número' })
      .int('La sucursal debe ser un número entero')
      .positive('La sucursal debe ser mayor a cero')
      .max(MAX_ID, 'La sucursal excede el límite admitido'),
  })
  .strict();

export const AbrirCajaSchema = z
  .object({
    idSucursal: IdSchema,
    montoApertura: DineroSchema,
  })
  .strict();

export const CerrarCajaSchema = z
  .object({
    montoCierre: DineroSchema,
  })
  .strict();

export type ListarCajasDto = z.infer<typeof ListarCajasSchema>;

export type CajaAbiertaQueryDto = z.infer<typeof CajaAbiertaQuerySchema>;

export type AbrirCajaDto = z.infer<typeof AbrirCajaSchema>;

export type CerrarCajaDto = z.infer<typeof CerrarCajaSchema>;
