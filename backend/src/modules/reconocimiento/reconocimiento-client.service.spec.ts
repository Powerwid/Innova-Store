import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReconocimientoClientService } from './reconocimiento-client.service.js';
import { reconocimientoConfig } from './reconocimiento.config.js';
import type { ReconocimientoConfig } from './reconocimiento.config.js';

const image = {
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  mimetype: 'image/jpeg',
};
const indexed = {
  idReferencia: 7,
  idProducto: 12,
  modelVersion: 'siglip2:test',
  dimension: 768,
};
const health = {
  status: 'ok',
  modelVersion: 'siglip2:test',
  referenceCount: 8,
  modelLoaded: false,
};

function client(
  settings: Record<string, string | number> = {},
  options: Partial<ReconocimientoConfig> = {},
) {
  return new ReconocimientoClientService(
    new ConfigService({
      RECOGNITION_SERVICE_URL: 'http://recognition:8000/',
      ...settings,
    }),
    { ...reconocimientoConfig, ...options },
  );
}

describe('ReconocimientoClientService', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('reporta configuración ausente sin enviar peticiones', async () => {
    const service = new ReconocimientoClientService(new ConfigService());
    expect(service.isConfigured()).toBe(false);
    await expect(service.getHealth()).rejects.toThrow(
      'Configura RECOGNITION_SERVICE_URL',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('consulta salud solo con la URL y sin permitir redirecciones', async () => {
    fetchMock.mockResolvedValue(Response.json(health));
    const service = client();
    expect(service.isConfigured()).toBe(true);
    await expect(service.getHealth()).resolves.toEqual(health);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://recognition:8000/health');
    expect(init?.method).toBe('GET');
    expect(init?.redirect).toBe('error');
    expect([...new Headers(init?.headers)]).toEqual([]);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('envía el archivo y producto como multipart sin definir boundary manualmente', async () => {
    fetchMock.mockResolvedValue(Response.json(indexed));
    await expect(client().indexReference(7, 12, image)).resolves.toEqual(
      indexed,
    );
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://recognition:8000/references/7');
    expect(init?.method).toBe('PUT');
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
    const form = init?.body as FormData;
    expect(form.get('idProducto')).toBe('12');
    const file = form.get('file') as File;
    expect(file.type).toBe('image/jpeg');
    expect(Buffer.from(await file.arrayBuffer())).toEqual(image.buffer);
  });

  it('rechaza la referencia si la respuesta identifica otro producto', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...indexed, idProducto: 999 }));
    await expect(client().indexReference(7, 12, image)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('transmite IDs permitidos y límite, y normaliza redondeo de similitud', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        modelVersion: indexed.modelVersion,
        matches: [{ idReferencia: 7, idProducto: 12, score: 1.000001 }],
      }),
    );
    const result = await client().search(image, [7, 8, 7], 2);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://recognition:8000/search');
    expect(init?.method).toBe('POST');
    const form = init?.body as FormData;
    expect(form.get('allowedReferenceIds')).toBe('[7,8]');
    expect(form.get('limit')).toBe('2');
    expect(result.matches[0]?.score).toBe(1);
  });

  it.each([
    { matches: [{ idReferencia: 999, idProducto: 12, score: 0.8 }] },
    {
      matches: [
        { idReferencia: 7, idProducto: 12, score: 0.8 },
        { idReferencia: 7, idProducto: 12, score: 0.7 },
      ],
    },
    { matches: [{ idReferencia: 7, idProducto: 12, score: 3 }] },
    { matches: [{ idReferencia: 7, idProducto: 12, score: Number.NaN }] },
  ])('rechaza resultados fuera del contrato (%j)', async ({ matches }) => {
    fetchMock.mockResolvedValue(
      Response.json({ modelVersion: indexed.modelVersion, matches }),
    );
    await expect(client().search(image, [7, 8], 2)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('no admite una lista de coincidencias mayor que el límite', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        modelVersion: indexed.modelVersion,
        matches: [
          { idReferencia: 7, idProducto: 12, score: 0.8 },
          { idReferencia: 8, idProducto: 13, score: 0.7 },
        ],
      }),
    );
    await expect(client().search(image, [7, 8], 1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('elimina referencias de forma idempotente', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(client().deleteReference(7)).resolves.toBeUndefined();
    await expect(client().deleteReference(7)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE');
  });

  it.each([400, 413, 415, 422])(
    'traduce el error de imagen HTTP %i sin exponer contenido remoto',
    async (status) => {
      fetchMock.mockResolvedValue(
        new Response('internal traceback', { status }),
      );
      await expect(
        client().indexReference(7, 12, image),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(client().getHealth()).rejects.not.toThrow(
        'internal traceback',
      );
    },
  );

  it('señala incompatibilidad de modelo como conflicto', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 409 }));
    await expect(client().indexReference(7, 12, image)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it.each([401, 403, 500, 503])(
    'traduce HTTP %i a servicio no disponible',
    async (status) => {
      fetchMock.mockResolvedValue(new Response(null, { status }));
      await expect(client().getHealth()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );

  it('oculta detalles de errores de conexión', async () => {
    fetchMock.mockRejectedValue(new Error('private network host details'));
    await expect(client().getHealth()).rejects.toThrow(
      'El servicio de reconocimiento no está disponible',
    );
    await expect(client().getHealth()).rejects.not.toThrow(
      'private network host',
    );
  });

  it('maneja desconexiones mientras recibe el cuerpo HTTP', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.error(
          new TypeError('Connection closed with secret details'),
        );
      },
    });
    fetchMock.mockResolvedValue(new Response(stream));
    await expect(client().getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('cancela peticiones al superar el tiempo configurado', async () => {
    let usedSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          usedSignal = init?.signal;
          usedSignal?.addEventListener(
            'abort',
            () => reject(usedSignal?.reason),
            { once: true },
          );
        }),
    );
    await expect(
      client({}, { timeoutMs: 15 }).getHealth(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(usedSignal?.aborted).toBe(true);
  });

  it.each([
    Response.json({ ...health, referenceCount: -1 }),
    Response.json({ ...health, modelLoaded: 'false' }),
    new Response('not-json'),
  ])('rechaza salud incompleta o JSON inválido', async (response) => {
    fetchMock.mockResolvedValue(response);
    await expect(client().getHealth()).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('rechaza configuración inválida y parámetros antes de enviar peticiones', async () => {
    await expect(
      client({ RECOGNITION_SERVICE_URL: 'file:///private' }).getHealth(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      client({}, { timeoutMs: 0 }).getHealth(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(client().search(image, [0], 2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(client().search(image, [7], 51)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(client().indexReference(-1, 2, image)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza versiones de modelo que no caben en el catálogo', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ...health, modelVersion: 'x'.repeat(256) }),
    );
    await expect(client().getHealth()).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
