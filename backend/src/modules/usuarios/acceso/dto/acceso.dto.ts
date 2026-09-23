import { z } from 'zod';

export const CrearRolSchema = z.object({
  nombre: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{2,49}$/),
});
export type CrearRolDto = z.infer<typeof CrearRolSchema>;

export const ActualizarRolSchema = z.object({
  nombre: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{2,49}$/).optional(),
  activo: z.boolean().optional(),
}).refine((data) => data.nombre !== undefined || data.activo !== undefined);
export type ActualizarRolDto = z.infer<typeof ActualizarRolSchema>;

export const AsignarRolSchema = z.object({ idRol: z.number().int().positive() });
export type AsignarRolDto = z.infer<typeof AsignarRolSchema>;

export const AsignarPermisoSchema = z.object({ idPermiso: z.number().int().positive() });
export type AsignarPermisoDto = z.infer<typeof AsignarPermisoSchema>;
