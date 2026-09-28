import { describe, expect, it } from 'vitest';
import {
  CantidadSchema,
  PrecioSchema,
  TipoAlmacenSchema,
  MovimientoSchema,
  ActualizarInventarioSchema,
  ActualizarConfiguracionGlobalSchema,
  ActualizarAlmacenSchema,
  ActualizarProductoSucursalSchema,
  ActualizarCategoriaSchema,
  CategoriaSchema,
  ListarSchema,
  ProductoSchema,
  AlmacenSchema,
} from './logistica.dto.js';

describe('validaciones de logística', () => {
  it('acepta kilos con tres decimales y precios exactos con dos', () => {
    expect(CantidadSchema.parse('0.125')).toBe('0.125');
    expect(PrecioSchema.parse(4.5)).toBe('4.5');
    for (const value of [
      '-1',
      '0.0001',
      '100000000000',
      'Infinity',
      '1,50',
      true,
      null,
    ]) {
      expect(CantidadSchema.safeParse(value).success).toBe(false);
    }
    expect(PrecioSchema.safeParse('1.001').success).toBe(false);
    expect(
      MovimientoSchema.safeParse({
        idInventario: 1,
        idTipoMovimiento: 2,
        cantidad: '0',
      }).success,
    ).toBe(false);
  });
  it('impide editar stock o cambiar la sucursal de una relación existente', () => {
    expect(
      ActualizarConfiguracionGlobalSchema.parse({
        activo: false,
      }),
    ).toEqual({ activo: false });
    expect(ActualizarConfiguracionGlobalSchema.safeParse({}).success).toBe(
      false,
    );
    expect(
      ActualizarConfiguracionGlobalSchema.safeParse({ activo: 1 }).success,
    ).toBe(false);
    expect(ActualizarInventarioSchema.safeParse({ stock: 90 }).success).toBe(
      false,
    );
    expect(
      ActualizarInventarioSchema.safeParse({ stockMinimo: 2, stock: 90 })
        .success,
    ).toBe(false);
    expect(ActualizarAlmacenSchema.safeParse({ idSucursal: 2 }).success).toBe(
      false,
    );
    expect(
      ActualizarProductoSucursalSchema.safeParse({ idProducto: 2 }).success,
    ).toBe(false);
  });
  it('valida el tipo de almacén y no lo reinicia en PATCH', () => {
    expect(TipoAlmacenSchema.parse('ALMACEN')).toBe('ALMACEN');
    expect(TipoAlmacenSchema.parse('AREA_VENTA')).toBe('AREA_VENTA');
    expect(
      TipoAlmacenSchema.safeParse('BODEGA').error?.issues[0]?.message,
    ).toBe('El tipo de almacén debe ser ALMACEN o AREA_VENTA');
    expect(
      AlmacenSchema.parse({ idSucursal: 1, nombre: 'Principal' }).tipo,
    ).toBe('ALMACEN');
    expect(
      AlmacenSchema.parse({
        idSucursal: 1,
        nombre: 'Mostrador',
        tipo: 'AREA_VENTA',
      }).tipo,
    ).toBe('AREA_VENTA');
    expect(ActualizarAlmacenSchema.parse({ nombre: 'Principal' })).toEqual({
      nombre: 'Principal',
    });
    expect(ActualizarAlmacenSchema.parse({ tipo: 'AREA_VENTA' })).toEqual({
      tipo: 'AREA_VENTA',
    });
  });
  it('valida colores, deja código de barras opcional y no reinicia estados en PATCH', () => {
    expect(
      CategoriaSchema.safeParse({ nombre: 'Carnes', color: '#F58220' }).success,
    ).toBe(true);
    expect(
      CategoriaSchema.safeParse({ nombre: 'Carnes', color: 'rojo' }).success,
    ).toBe(false);
    expect(
      ProductoSchema.safeParse({
        nombre: 'Papa',
        idTipoProducto: 1,
        idCategoria: 1,
        idUnidadMedida: 1,
      }).success,
    ).toBe(true);
    expect(ActualizarCategoriaSchema.parse({ nombre: 'Carnes' })).toEqual({
      nombre: 'Carnes',
    });
    expect(
      ActualizarProductoSucursalSchema.parse({ precioVenta: '5' }),
    ).toEqual({ precioVenta: '5' });
    expect(ActualizarCategoriaSchema.safeParse({}).success).toBe(false);
    expect(ListarSchema.parse({ estado: 'false' }).estado).toBe(false);
    expect(ListarSchema.safeParse({ limite: 1000 }).success).toBe(false);
  });
});
