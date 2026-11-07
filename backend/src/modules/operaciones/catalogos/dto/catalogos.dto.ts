import { z } from 'zod';
import {
  PaginacionSchema,
  textoRequerido,
} from '../../compartido/dto/operaciones-base.dto.js';

export const ListarCatalogosSchema = PaginacionSchema.extend({
  buscar: z
    .string({ error: 'La búsqueda debe ser texto' })
    .trim()
    .max(100, 'La búsqueda no puede superar los 100 caracteres')
    .optional(),
  activo: z
    .enum(['true', 'false'], { error: 'El estado debe ser true o false' })
    .transform((value) => value === 'true')
    .optional(),
});

export const ListarTiposComprobanteSchema = ListarCatalogosSchema.omit({
  activo: true,
});

export const motivoSchema = z
  .object({
    motivo: textoRequerido('El motivo', 100),
    activo: z
      .boolean({ error: 'El estado activo debe ser verdadero o falso' })
      .default(true),
  })
  .strict();

export const actualizarMotivoSchema = z
  .object({
    motivo: textoRequerido('El motivo', 100).optional(),
    activo: z
      .boolean({ error: 'El estado activo debe ser verdadero o falso' })
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((campo) => campo !== undefined),
    'Debe enviar al menos un campo',
  );

export const MotivoIngresoSchema = motivoSchema;

export const ActualizarMotivoIngresoSchema = actualizarMotivoSchema;

export const MotivoEgresoSchema = motivoSchema;

export const ActualizarMotivoEgresoSchema = actualizarMotivoSchema;

export const TipoComprobanteSchema = z
  .object({
    nombre: textoRequerido('El nombre', 100),
    codigoSunat: z
      .string({ error: 'El código SUNAT debe ser texto' })
      .trim()
      .regex(/^\d{2}$/, 'El código SUNAT debe tener exactamente 2 dígitos')
      .nullable()
      .optional()
      .transform((value) => value || null),
  })
  .strict();

export const ActualizarTipoComprobanteSchema = z
  .object({
    nombre: textoRequerido('El nombre', 100).optional(),
    codigoSunat: z
      .string({ error: 'El código SUNAT debe ser texto' })
      .trim()
      .regex(/^\d{2}$/, 'El código SUNAT debe tener exactamente 2 dígitos')
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((campo) => campo !== undefined),
    'Debe enviar al menos un campo',
  );

export type MotivoIngresoDto = z.infer<typeof MotivoIngresoSchema>;

export type ActualizarMotivoIngresoDto = z.infer<
  typeof ActualizarMotivoIngresoSchema
>;

export type MotivoEgresoDto = z.infer<typeof MotivoEgresoSchema>;

export type ActualizarMotivoEgresoDto = z.infer<
  typeof ActualizarMotivoEgresoSchema
>;

export type TipoComprobanteDto = z.infer<typeof TipoComprobanteSchema>;

export type ActualizarTipoComprobanteDto = z.infer<
  typeof ActualizarTipoComprobanteSchema
>;
