import { z } from 'zod';

export const CambiarContrasenaSchema = z.object({
  contrasenaActual: z
    .string()
    .min(1, 'La contraseña actual es obligatoria'),

  contrasenaNueva: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .regex(
      /[A-Z]/,
      'La nueva contraseña debe contener al menos una letra mayúscula',
    )
    .regex(
      /\d/,
      'La nueva contraseña debe contener al menos un número',
    )
    .max(255, 'La nueva contraseña no puede superar los 255 caracteres'),
});
export type CambiarContrasenaDto = z.infer<typeof CambiarContrasenaSchema>;
