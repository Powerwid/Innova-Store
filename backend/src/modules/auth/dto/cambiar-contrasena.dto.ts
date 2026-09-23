import { z } from 'zod';

export const CambiarContrasenaSchema = z.object({
  contrasenaActual: z.string().min(1),
  contrasenaNueva: z.string().min(8).regex(/[A-Z]/).regex(/\d/).max(255),
});
export type CambiarContrasenaDto = z.infer<typeof CambiarContrasenaSchema>;
