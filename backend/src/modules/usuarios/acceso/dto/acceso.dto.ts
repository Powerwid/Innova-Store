import { z } from 'zod';

export const CrearRolSchema = z.object({
  nombre: z
    .string({ error: 'El nombre del rol es obligatorio' })
    .trim()
    .toUpperCase()
    .min(3, 'El nombre del rol debe tener al menos 3 caracteres')
    .max(50, 'El nombre del rol no puede superar los 50 caracteres')
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'El nombre del rol debe iniciar con una letra y solo puede contener letras, números y guiones bajos',
    ),
});
export type CrearRolDto = z.infer<typeof CrearRolSchema>;

export const SincronizarPermisosSchema = z.object({
  idsPermisos: z
    .array(
      z
        .number({ error: 'Cada identificador de permiso debe ser un número' })
        .int('Cada identificador de permiso debe ser un número entero')
        .positive('Cada identificador de permiso debe ser mayor que cero'),
      { error: 'La lista de permisos es obligatoria' },
    )
    .max(500, 'No se pueden asignar más de 500 permisos a un rol')
    .refine(
      (idsPermisos) => new Set(idsPermisos).size === idsPermisos.length,
      'La lista de permisos no puede contener identificadores repetidos',
    ),
});
export type SincronizarPermisosDto = z.infer<typeof SincronizarPermisosSchema>;
