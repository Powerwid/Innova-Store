import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  RECONOCIMIENTO_CONFIG,
  reconocimientoConfig,
} from './reconocimiento.config.js';
import type { ReconocimientoConfig } from './reconocimiento.config.js';

const positiveId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const modelVersion = z.string().trim().min(1).max(255);
const healthSchema = z.object({
  status: z.string().min(1),
  modelVersion,
  referenceCount: z.number().int().nonnegative(),
  modelLoaded: z.boolean(),
});
const referenceSchema = z.object({
  idReferencia: positiveId,
  idProducto: positiveId,
  modelVersion,
  dimension: positiveId,
});
const searchSchema = z.object({
  modelVersion,
  matches: z.array(
    z.object({
      idReferencia: positiveId,
      idProducto: positiveId,
      // Floating point normalization can produce a tiny overshoot of cosine 1.
      score: z
        .number()
        .min(-1.00001)
        .max(1.00001)
        .transform((value) => Math.max(-1, Math.min(1, value))),
    }),
  ),
});

export type RecognitionHealth = z.infer<typeof healthSchema>;
export type IndexedReference = z.infer<typeof referenceSchema>;
export type RecognitionSearchResult = z.infer<typeof searchSchema>;
export interface RecognitionImage {
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class ReconocimientoClientService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Optional()
    @Inject(RECONOCIMIENTO_CONFIG)
    private readonly options: ReconocimientoConfig = reconocimientoConfig,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('RECOGNITION_SERVICE_URL')?.trim());
  }

  async getHealth(): Promise<RecognitionHealth> {
    return this.request('/health', { method: 'GET' }, healthSchema);
  }

  async indexReference(
    idReferencia: number,
    idProducto: number,
    file: RecognitionImage,
  ): Promise<IndexedReference> {
    this.validateId(idReferencia);
    this.validateId(idProducto);
    const form = this.imageForm(file);
    form.set('idProducto', String(idProducto));
    const result = await this.request(
      `/references/${idReferencia}`,
      { method: 'PUT', body: form },
      referenceSchema,
    );
    if (
      result.idReferencia !== idReferencia ||
      result.idProducto !== idProducto
    ) {
      throw new BadGatewayException(
        'El servicio de reconocimiento devolvió una referencia incorrecta',
      );
    }
    return result;
  }

  async deleteReference(id: number): Promise<void> {
    this.validateId(id);
    await this.request(
      `/references/${id}`,
      { method: 'DELETE' },
      undefined,
      true,
    );
  }

  async search(
    file: RecognitionImage,
    allowedReferenceIds: number[],
    limit: number,
  ): Promise<RecognitionSearchResult> {
    this.validateId(limit);
    if (limit > 50) {
      throw new BadRequestException(
        'El límite de reconocimiento no puede superar 50 referencias',
      );
    }
    for (const id of allowedReferenceIds) this.validateId(id);
    const ids = [...new Set(allowedReferenceIds)];
    const form = this.imageForm(file);
    form.set('allowedReferenceIds', JSON.stringify(ids));
    form.set('limit', String(limit));
    const result = await this.request(
      '/search',
      { method: 'POST', body: form },
      searchSchema,
    );
    const allowed = new Set(ids);
    const seen = new Set<number>();
    if (
      result.matches.length > limit ||
      result.matches.some((match) => {
        if (!allowed.has(match.idReferencia) || seen.has(match.idReferencia))
          return true;
        seen.add(match.idReferencia);
        return false;
      })
    ) {
      throw new BadGatewayException(
        'El servicio de reconocimiento devolvió resultados incorrectos',
      );
    }
    return result;
  }

  private validateId(id: number): void {
    if (!positiveId.safeParse(id).success) {
      throw new BadRequestException(
        'El identificador o límite de reconocimiento debe ser un entero positivo',
      );
    }
  }

  private imageForm(file: RecognitionImage): FormData {
    const form = new FormData();
    const extension =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    form.set(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      `image.${extension}`,
    );
    return form;
  }

  private serviceUrl(path: string): string {
    const base = this.config.get<string>('RECOGNITION_SERVICE_URL')?.trim();
    if (!base) {
      throw new ServiceUnavailableException(
        'Configura RECOGNITION_SERVICE_URL para habilitar el reconocimiento visual',
      );
    }
    try {
      const parsed = new URL(base);
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash
      ) {
        throw new Error('Invalid service URL');
      }
      return `${parsed.href.replace(/\/+$/, '')}${path}`;
    } catch {
      throw new ServiceUnavailableException(
        'RECOGNITION_SERVICE_URL debe ser una URL HTTP o HTTPS válida',
      );
    }
  }

  private timeout(): number {
    const value = this.options.timeoutMs;
    if (!Number.isInteger(value) || value <= 0 || value > 2_147_483_647) {
      throw new ServiceUnavailableException(
        'El tiempo de espera del reconocimiento debe ser un número positivo de milisegundos',
      );
    }
    return value;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    schema?: z.ZodType<T>,
    allowMissing = false,
  ): Promise<T> {
    const url = this.serviceUrl(path);
    const signal = AbortSignal.timeout(this.timeout());
    let response: Response;
    try {
      // Una redirección inesperada se considera un fallo de conexión.
      response = await fetch(url, {
        ...init,
        signal,
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException(
        'El servicio de reconocimiento no está disponible o agotó el tiempo de espera',
      );
    }
    if (allowMissing && response.status === 404) return undefined as T;
    if (!response.ok) {
      if ([400, 413, 415, 422].includes(response.status)) {
        throw new BadRequestException(
          'La imagen o los parámetros no son válidos para el reconocimiento',
        );
      }
      if (response.status === 409) {
        throw new ConflictException(
          'El índice visual es incompatible con la versión del modelo; vuelve a indexar las referencias',
        );
      }
      if (
        response.status >= 500 ||
        [401, 403, 408, 429].includes(response.status)
      ) {
        throw new ServiceUnavailableException(
          'El servicio de reconocimiento no está disponible',
        );
      }
      throw new BadGatewayException(
        'El servicio de reconocimiento devolvió una respuesta inesperada',
      );
    }
    if (!schema) return undefined as T;
    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      if (signal.aborted) {
        throw new ServiceUnavailableException(
          'El servicio de reconocimiento agotó el tiempo de espera',
        );
      }
      if (!(error instanceof SyntaxError)) {
        throw new ServiceUnavailableException(
          'Se interrumpió la conexión con el servicio de reconocimiento',
        );
      }
      throw new BadGatewayException(
        'El servicio de reconocimiento devolvió una respuesta inválida',
      );
    }
    const result = schema.safeParse(json);
    if (!result.success) {
      throw new BadGatewayException(
        'El servicio de reconocimiento devolvió una respuesta inválida',
      );
    }
    return result.data;
  }
}
