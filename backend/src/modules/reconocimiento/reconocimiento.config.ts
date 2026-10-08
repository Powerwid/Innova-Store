// Ajustes internos del módulo. La conexión externa solo usa la URL de la API.
export interface ReconocimientoConfig {
  readonly timeoutMs: number;
  readonly storageDir: string;
  readonly workerEnabled: boolean;
  readonly pollMs: number;
  readonly minScore: number;
}

export const RECONOCIMIENTO_CONFIG = Symbol('RECONOCIMIENTO_CONFIG');

export const reconocimientoConfig: ReconocimientoConfig = Object.freeze({
  timeoutMs: 120_000,
  storageDir: 'storage/reconocimiento',
  workerEnabled: true,
  pollMs: 5_000,
  // Umbral provisional: debe evaluarse con fotos reales del minimarket.
  minScore: 0.7,
});
