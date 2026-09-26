import { describe, expect, it } from 'vitest';
import { ActualizarSucursalSchema, CrearSucursalSchema } from './sucursal.dto.js';

const sucursal = {
  nombre: 'Sucursal Principal',
  perfil: {
    idTipoDocumento: 2,
    numeroDocumento: '20123456789',
    razonSocial: 'Innova Store S.A.C.',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'San Isidro',
    direccionComercial: 'Av. Comercial 456',
    direccionFiscal: 'Av. Fiscal 123',
    direccionWeb: 'https://ejemplo.com',
    igv: 18.99,
    telefono: '(01) 123-4567',
    correo: 'sucursal@ejemplo.com',
  },
};

describe('datos de sucursal', () => {
  it('acepta los datos comerciales, ubicación y contacto del formulario', () => {
    expect(CrearSucursalSchema.parse(sucursal).perfil.igv).toBe(18.99);
  });

  it('rechaza la creación sin RUC y contacto completos', () => {
    expect(CrearSucursalSchema.safeParse({ nombre: 'Sucursal Principal' }).success).toBe(false);
    expect(CrearSucursalSchema.safeParse({
      ...sucursal,
      perfil: { ...sucursal.perfil, numeroDocumento: '123', correo: 'sin-correo' },
    }).success).toBe(false);
  });

  it('permite cambiar solo el estado mediante PATCH', () => {
    expect(ActualizarSucursalSchema.parse({ activo: false })).toEqual({ activo: false });
  });
});
