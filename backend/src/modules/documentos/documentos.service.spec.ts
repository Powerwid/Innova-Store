import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma/prisma.service.js';
import type { DecolectaClient } from './decolecta.client.js';
import { DocumentosService } from './documentos.service.js';

function setup() {
  const consultar = vi.fn();
  const findUnique = vi.fn(async ({ where }: { where: { nombre: string } }) => ({
    idTipoDocumento: where.nombre === 'DNI' ? 1 : 2,
    activo: true,
  }));
  const service = new DocumentosService(
    { consultar } as unknown as DecolectaClient,
    { tipoDocumento: { findUnique } } as unknown as PrismaService,
  );
  return { service, consultar, findUnique };
}

describe('consulta de documentos para formularios', () => {
  it('convierte los nombres de DNI a formato legible', async () => {
    const { service, consultar } = setup();
    consultar.mockResolvedValue({
      first_name: 'JOSEPH KLEYN',
      first_last_name: 'MAMANI',
      second_last_name: 'PEREZ',
      document_number: '12345678',
    });

    await expect(service.consultar('dni', '12345678')).resolves.toEqual({
      tipoDocumento: 'DNI',
      idTipoDocumento: 1,
      numeroDocumento: '12345678',
      nombres: 'Joseph Kleyn',
      apellidos: 'Mamani Perez',
      nombreCompleto: 'Joseph Kleyn Mamani Perez',
    });
  });

  it('convierte razón social y dirección de RUC sin alterar los códigos SUNAT', async () => {
    const { service, consultar } = setup();
    consultar.mockResolvedValue({
      razon_social: 'INNOVA STORE S.A.C.',
      numero_documento: '20123456789',
      direccion: 'AV. JOSE GALVEZ 123',
      ubigeo: '150131',
      departamento: 'LIMA',
      provincia: 'LIMA',
      distrito: 'SAN ISIDRO',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
    });

    await expect(service.consultar('RUC', '20123456789')).resolves.toEqual({
      tipoDocumento: 'RUC',
      idTipoDocumento: 2,
      numeroDocumento: '20123456789',
      razonSocial: 'Innova Store S.A.C.',
      direccion: 'Av. Jose Galvez 123',
      ubigeo: '150131',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'San Isidro',
      estadoSunat: 'ACTIVO',
      condicionSunat: 'HABIDO',
    });
  });

  it('rechaza números inválidos antes de llamar al proveedor', async () => {
    const { service, consultar } = setup();
    await expect(service.consultar('DNI', '123')).rejects.toBeInstanceOf(BadRequestException);
    expect(consultar).not.toHaveBeenCalled();
  });

  it('rechaza una respuesta que corresponde a otro documento', async () => {
    const { service, consultar } = setup();
    consultar.mockResolvedValue({
      first_name: 'JOSEPH',
      first_last_name: 'MAMANI',
      document_number: '87654321',
    });
    await expect(service.consultar('DNI', '12345678')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
