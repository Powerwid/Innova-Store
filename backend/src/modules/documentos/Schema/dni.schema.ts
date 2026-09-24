import { z } from 'zod';

export const DniSchema = z.object({
    first_name: z.string().trim().min(1),
    first_last_name: z.string().trim().min(1),
    second_last_name: z.string().trim().optional().default(''),
    document_number: z.string().regex(/^\d{8}$/),
});

export type DniDto = z.infer<typeof DniSchema>;