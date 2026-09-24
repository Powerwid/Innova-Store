import { BadGatewayException, BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TipoConsultaDocumento = 'DNI' | 'RUC';

@Injectable()
export class DecolectaClient {
  constructor(private readonly config: ConfigService) { }

  async consultar(tipo: TipoConsultaDocumento, numero: string): Promise<unknown> {
    const token = this.config.get<string>('DECOLECTA_TOKEN')?.trim();
    if (!token) {
      throw new ServiceUnavailableException('La consulta de documentos no está configurada');
    }

    const baseUrl = (this.config.get<string>('DECOLECTA_URL') ||
      'https://api.decolecta.com/v1').replace(/\/+$/, '');
    const recurso = tipo === 'DNI' ? 'reniec/dni' : 'sunat/ruc';
    const url = new URL(`${baseUrl}/${recurso}`);
    url.searchParams.set('numero', numero);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ServiceUnavailableException('No se pudo consultar el documento en este momento');
    }

    if (response.status === 404) throw new NotFoundException('Documento no encontrado');
    if (response.status === 400 || response.status === 422) {
      throw new BadRequestException('Documento inválido o no encontrado');
    }
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new ServiceUnavailableException('El proveedor de documentos no está disponible');
    }
    if (!response.ok) throw new BadGatewayException('Respuesta inválida del proveedor de documentos');

    try {
      return await response.json();
    } catch {
      throw new BadGatewayException('El proveedor devolvió una respuesta inválida');
    }
  }
}
