import { z } from 'zod';

export const TipoPersonaSchema = z.enum(['CLIENTE', 'PROVEEDOR']);
export type TipoPersona = z.infer<typeof TipoPersonaSchema>;

const textoOpcional = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const personaBaseSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(255),
  idTipoDocumento: z
    .number()
    .int()
    .positive(),
  numeroDocumento: z
    .string()
    .trim()
    .min(1, 'El número de documento es obligatorio').max(20),
  direccion: textoOpcional(255),
  ubigeo: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'El ubigeo debe tener 6 dígitos')
    .nullable()
    .optional(),
  correo: z
    .email('El correo electrónico no es válido')
    .max(255)
    .nullable()
    .optional(),
  telefono: textoOpcional(20),
  activo: z
    .boolean()
    .default(true),
  idSucursal: z
    .number()
    .int()
    .positive()
    .optional(),
});

export const CrearPersonaSchema = personaBaseSchema.extend({
  tipo: TipoPersonaSchema,
});
export type CrearPersonaDto = z.infer<typeof CrearPersonaSchema>;

export const ActualizarPersonaSchema = personaBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Debe enviar al menos un campo');
export type ActualizarPersonaDto = z.infer<typeof ActualizarPersonaSchema>;

export const ListarPersonasSchema = z.object({
  tipo: TipoPersonaSchema.default('CLIENTE'),
  buscar: z.string().trim().max(255).optional(),
  idSucursal: z.coerce.number().int().positive().optional(),
});
export type ListarPersonasDto = z.infer<typeof ListarPersonasSchema>;
