import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { DecolectaClient } from './decolecta.client.js';
import type { TipoConsultaDocumento } from './decolecta.client.js';
import { DniSchema } from './Schema/dni.schema.js';
import { RucSchema } from './Schema/ruc.schema.js';


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
  ) { }

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
      const documento = DniSchema.safeParse(respuesta);
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

    const documento = RucSchema.safeParse(respuesta);
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
      departamento: documento.data.departamento ? capitalizar(documento.data.departamento) : null,
      provincia: documento.data.provincia ? capitalizar(documento.data.provincia) : null,
      distrito: documento.data.distrito ? capitalizar(documento.data.distrito) : null,
      estadoSunat: documento.data.estado || null,
      condicionSunat: documento.data.condicion || null,
    };
  }
}
