import { z } from 'zod';

export const RucSchema = z.object({
    razon_social: z.string().trim().min(1),
    numero_documento: z.string().regex(/^\d{11}$/),
    direccion: z.string().nullish(),
    ubigeo: z.string().nullish(),
    estado: z.string().nullish(),
    condicion: z.string().nullish(),
});

export type RucDto = z.infer<typeof RucSchema>;