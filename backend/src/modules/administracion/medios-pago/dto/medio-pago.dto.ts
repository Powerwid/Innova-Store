import { z } from 'zod';

export const MedioPagoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio')
    .max(45, 'El nombre no puede superar los 45 caracteres'),
});

export type MedioPagoDto = z.infer<typeof MedioPagoSchema>;
