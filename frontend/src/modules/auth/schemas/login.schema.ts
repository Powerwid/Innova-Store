import { z } from 'zod'

export const loginSchema = z.object({
  correo: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .max(255, 'El correo no puede superar los 255 caracteres'),
  contrasena: z
    .string()
    .min(1, 'La contraseña es obligatoria')
    .max(255, 'La contraseña no puede superar los 255 caracteres'),
})

export type LoginForm = z.infer<typeof loginSchema>
