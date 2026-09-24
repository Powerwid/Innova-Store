import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { DecolectaClient, type TipoConsultaDocumento } from './decolecta.client.js';

const dniSchema = z.object({
  first_name: z.string().trim().min(1),
  first_last_name: z.string().trim().min(1),
  second_last_name: z.string().trim().optional().default(''),
  document_number: z.string().regex(/^\d{8}$/),
});

const rucSchema = z.object({
  razon_social: z.string().trim().min(1),
  numero_documento: z.string().regex(/^\d{11}$/),
  direccion: z.string().nullish(),
  ubigeo: z.string().nullish(),
  estado: z.string().nullish(),
  condicion: z.string().nullish(),
});

function capitalizar(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-PE')
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s.'/-])(\p{L})/gu, (_match, separador: string, letra: string) =>
      `${separador}${letra.toLocaleUpperCase('es-PE')}`,
    );
}

@Injectable()
export class DocumentosService {
  constructor(
    private readonly decolecta: DecolectaClient,
    private readonly prisma: PrismaService,
  ) {}

  async consultar(tipoEntrada: string, numeroEntrada: string) {
    const tipo = tipoEntrada.trim().toUpperCase();
    if (tipo !== 'DNI' && tipo !== 'RUC') {
      throw new BadRequestException('Solo se pueden consultar documentos DNI y RUC');
    }
    const numero = numeroEntrada.trim();
    const patron = tipo === 'DNI' ? /^\d{8}$/ : /^\d{11}$/;
    if (!patron.test(numero)) {
      throw new BadRequestException(
        tipo === 'DNI' ? 'El DNI debe tener 8 dígitos' : 'El RUC debe tener 11 dígitos',
      );
    }

    const tipoDocumento = await this.prisma.tipoDocumento.findUnique({
      where: { nombre: tipo },
      select: { idTipoDocumento: true, activo: true },
    });
    if (!tipoDocumento) throw new NotFoundException('Tipo de documento no encontrado');
    if (!tipoDocumento.activo) throw new ConflictException('Tipo de documento inactivo');

    const respuesta = await this.decolecta.consultar(tipo as TipoConsultaDocumento, numero);
    if (tipo === 'DNI') {
      const documento = dniSchema.safeParse(respuesta);
      if (!documento.success || documento.data.document_number !== numero) {
        throw new BadGatewayException('El proveedor devolvió datos de DNI inválidos');
      }
      const nombres = capitalizar(documento.data.first_name);
      const apellidos = capitalizar(
        [documento.data.first_last_name, documento.data.second_last_name]
          .filter(Boolean).join(' '),
      );
      return {
        tipoDocumento: 'DNI' as const,
        idTipoDocumento: tipoDocumento.idTipoDocumento,
        numeroDocumento: numero,
        nombres,
        apellidos,
        nombreCompleto: `${nombres} ${apellidos}`,
      };
    }

    const documento = rucSchema.safeParse(respuesta);
    if (!documento.success || documento.data.numero_documento !== numero) {
      throw new BadGatewayException('El proveedor devolvió datos de RUC inválidos');
    }
    return {
      tipoDocumento: 'RUC' as const,
      idTipoDocumento: tipoDocumento.idTipoDocumento,
      numeroDocumento: numero,
      razonSocial: capitalizar(documento.data.razon_social),
      direccion: documento.data.direccion ? capitalizar(documento.data.direccion) : null,
      ubigeo: documento.data.ubigeo || null,
      estadoSunat: documento.data.estado || null,
      condicionSunat: documento.data.condicion || null,
    };
  }
}
