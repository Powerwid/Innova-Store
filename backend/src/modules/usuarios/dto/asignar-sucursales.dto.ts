import { z } from 'zod';

export const AsignarSucursalesSchema = z.object({
  idsSucursales: z
    .array(z.number().int().positive())
    .max(100)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'No se permiten sucursales repetidas',
    ),
});
export type AsignarSucursalesDto = z.infer<typeof AsignarSucursalesSchema>;
