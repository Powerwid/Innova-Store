export interface MotivoInput {
  motivo: string;
  activo?: boolean;
}

export interface TipoComprobanteInput {
  nombre: string;
  codigoSunat?: string | null;
}
