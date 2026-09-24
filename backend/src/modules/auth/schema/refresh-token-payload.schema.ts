import { z } from 'zod';

export const RefreshTokenPayloadSchema = z.object({
    sub: z.number().int().positive(),
    tipo: z.literal('refresh'),
});

export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;