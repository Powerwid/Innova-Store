import { z } from 'zod';

const id = z.coerce.number().int().positive().max(2147483647);
export const IdReconocimientoSchema = id;

export const ReconocerProductoSchema = z
  .object({
    idSucursal: id,
    limite: z.coerce.number().int().min(1).max(10).default(5),
  })
  .strict();

export const ListarReferenciasSchema = z
  .object({
    pagina: z.coerce.number().int().min(1).max(1000000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type ReconocerProductoDto = z.infer<typeof ReconocerProductoSchema>;
export type ListarReferenciasDto = z.infer<typeof ListarReferenciasSchema>;
