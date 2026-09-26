import { z } from 'zod';

const requerido = (etiqueta: string, max = 255) =>
  z.string().trim().min(1, `${etiqueta} es obligatorio`).max(max);

const perfilSchema = z.object({
  idTipoDocumento: z.number().int().positive(),
  numeroDocumento: z.string().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos'),
  razonSocial: requerido('La razón social'),
  nombreComercial: z.string().trim().max(255).nullable().optional(),
  departamento: requerido('El departamento', 100),
  provincia: requerido('La provincia', 100),
  distrito: requerido('El distrito', 100),
  direccionComercial: requerido('La dirección comercial'),
  direccionFiscal: requerido('La dirección fiscal'),
  direccionWeb: z.url('La dirección web debe ser una URL válida').max(255)
    .refine((url) => /^https?:\/\//i.test(url), 'La dirección web debe usar http o https')
    .nullable().optional(),
  ubigeo: z.string().regex(/^\d{6}$/, 'El ubigeo debe tener 6 dígitos').nullable().optional(),
  igv: z.number().min(0).max(100)
    .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value)), 'El IGV admite hasta dos decimales')
    .default(18),
  telefono: requerido('El teléfono', 20),
  correo: z.email('El correo electrónico no es válido').max(255),
});

export const CrearSucursalSchema = z.object({
  nombre: requerido('El nombre de la sucursal'),
  perfil: perfilSchema,
});
export type CrearSucursalDto = z.infer<typeof CrearSucursalSchema>;

export const ActualizarSucursalSchema = z
  .object({
    nombre: requerido('El nombre de la sucursal').optional(),
    activo: z.boolean().optional(),
    perfil: perfilSchema.partial().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    'Debe enviar al menos un campo',
  );
export type ActualizarSucursalDto = z.infer<typeof ActualizarSucursalSchema>;
