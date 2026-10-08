import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { idRequerido, PREFIJO_TEST } from '../contexto-test.js';
import type { categoriasTest } from './categorias.seed.js';
import type { tiposProductoTest } from './tipos-producto.seed.js';
import type { unidadesMedidaTest } from './unidades-medida.seed.js';

export interface ProductoTest {
  nombre: string;
  categoria: (typeof categoriasTest)[number]['nombre'];
  unidad: (typeof unidadesMedidaTest)[number]['simbolo'];
  tipo: (typeof tiposProductoTest)[number];
  detalle: string;
  precioCompra: string;
  precioVenta: string;
  stockInicial: string;
  stockMinimo: string;
  codigoBarras: string | null;
  estado: boolean;
  estadoSucursal: boolean;
  sinAsignar: boolean;
}

function producto(
  nombre: string,
  categoria: ProductoTest['categoria'],
  unidad: ProductoTest['unidad'],
  compra: string,
  venta: string,
  stock: string,
  opciones: Partial<ProductoTest> = {},
): ProductoTest {
  return {
    nombre,
    categoria,
    unidad,
    precioCompra: compra,
    precioVenta: venta,
    stockInicial: stock,
    stockMinimo: '3.000',
    tipo: 'Mercadería',
    detalle: `Producto de prueba. Se contabiliza en ${unidad}.`,
    codigoBarras: null,
    estado: true,
    estadoSucursal: true,
    sinAsignar: false,
    ...opciones,
  };
}

// Precios y existencias ficticios. Los envases se contabilizan por unidad.
export const productosTest: ProductoTest[] = [
  producto('Arroz a granel', 'Abarrotes', 'KG', '3.20', '4.50', '25.000', {
    stockMinimo: '8.000',
  }),
  producto('Azúcar bolsa 1 kg', 'Abarrotes', 'UND', '3.60', '4.60', '12.000', {
    codigoBarras: '2000000000008',
    stockMinimo: '5.000',
  }),
  producto('Pollo fresco', 'Frescos', 'KG', '10.00', '13.90', '8.500', {
    tipo: 'Fresco',
    stockMinimo: '2.000',
  }),
  producto('Pan francés', 'Panadería', 'UND', '0.25', '0.40', '6.000', {
    tipo: 'Fresco',
    stockMinimo: '10.000',
  }),
  producto('Clavos a granel', 'Ferretería', 'KG', '4.00', '6.00', '0.000', {
    tipo: 'Hogar',
  }),
  producto('Tomate italiano', 'Verduras', 'KG', '2.00', '3.50', '15.750', {
    tipo: 'Fresco',
  }),
  producto('Tomate cherry', 'Verduras', 'KG', '6.00', '9.00', '4.250', {
    tipo: 'Fresco',
  }),
  producto('Papa blanca', 'Verduras', 'KG', '1.50', '2.80', '35.000', {
    tipo: 'Fresco',
  }),
  producto('Papa amarilla', 'Verduras', 'KG', '3.00', '5.00', '18.500', {
    tipo: 'Fresco',
  }),
  producto('Cebolla roja', 'Verduras', 'KG', '1.80', '3.20', '20.000', {
    tipo: 'Fresco',
  }),
  producto('Cebolla blanca', 'Verduras', 'KG', '2.50', '4.00', '9.500', {
    tipo: 'Fresco',
  }),
  producto('Zanahoria', 'Verduras', 'KG', '1.50', '2.50', '10.000', {
    tipo: 'Fresco',
  }),
  producto('Lechuga americana', 'Verduras', 'UND', '1.00', '2.00', '18.000', {
    tipo: 'Fresco',
  }),
  producto('Pepino', 'Verduras', 'KG', '1.80', '3.00', '8.750', {
    tipo: 'Fresco',
  }),
  producto('Pimiento rojo', 'Verduras', 'KG', '4.00', '6.50', '5.250', {
    tipo: 'Fresco',
  }),
  producto('Limón sutil', 'Frutas', 'KG', '3.00', '5.00', '12.000', {
    tipo: 'Fresco',
  }),
  producto('Plátano de seda', 'Frutas', 'KG', '2.00', '3.50', '16.500', {
    tipo: 'Fresco',
  }),
  producto('Manzana roja', 'Frutas', 'KG', '3.50', '5.50', '14.000', {
    tipo: 'Fresco',
  }),
  producto('Manzana verde', 'Frutas', 'KG', '4.00', '6.00', '9.750', {
    tipo: 'Fresco',
  }),
  producto('Naranja de jugo', 'Frutas', 'KG', '1.80', '3.00', '25.000', {
    tipo: 'Fresco',
  }),
  producto('Palta fuerte', 'Frutas', 'KG', '5.00', '8.00', '7.500', {
    tipo: 'Fresco',
  }),
  producto('Papaya', 'Frutas', 'KG', '2.00', '3.50', '11.250', {
    tipo: 'Fresco',
  }),
  producto('Pechuga de pollo', 'Frescos', 'KG', '14.00', '18.50', '6.250', {
    tipo: 'Refrigerado',
  }),
  producto(
    'Carne de res para guiso',
    'Frescos',
    'KG',
    '22.00',
    '29.00',
    '8.000',
    { tipo: 'Refrigerado' },
  ),
  producto('Carne molida de res', 'Frescos', 'KG', '18.00', '24.00', '1.250', {
    tipo: 'Refrigerado',
  }),
  producto('Chuleta de cerdo', 'Frescos', 'KG', '15.00', '21.00', '5.500', {
    tipo: 'Refrigerado',
  }),
  producto('Bonito fresco', 'Pescados', 'KG', '8.00', '12.00', '4.750', {
    tipo: 'Refrigerado',
  }),
  producto('Filete de merluza', 'Pescados', 'KG', '12.00', '17.00', '0.000', {
    tipo: 'Refrigerado',
  }),
  producto('Leche entera 1 L', 'Lácteos', 'UND', '3.80', '5.20', '24.000'),
  producto(
    'Leche deslactosada 1 L',
    'Lácteos',
    'UND',
    '4.50',
    '6.00',
    '18.000',
  ),
  producto('Leche evaporada 400 g', 'Lácteos', 'UND', '3.50', '4.80', '36.000'),
  producto('Yogur natural 1 L', 'Lácteos', 'UND', '5.00', '7.50', '12.000', {
    tipo: 'Refrigerado',
  }),
  producto('Yogur de fresa 1 L', 'Lácteos', 'UND', '5.20', '7.80', '15.000', {
    tipo: 'Refrigerado',
  }),
  producto('Queso fresco', 'Lácteos', 'KG', '15.00', '22.00', '5.500', {
    tipo: 'Refrigerado',
  }),
  producto('Mantequilla 200 g', 'Lácteos', 'UND', '4.00', '6.00', '10.000', {
    tipo: 'Refrigerado',
  }),
  producto(
    'Huevo rosado por unidad',
    'Huevos',
    'UND',
    '0.45',
    '0.65',
    '90.000',
  ),
  producto(
    'Huevo blanco por docena',
    'Huevos',
    'DOC',
    '5.00',
    '7.00',
    '15.000',
  ),
  producto(
    'Huevo rosado bandeja de 30',
    'Huevos',
    'UND',
    '12.50',
    '17.00',
    '8.000',
  ),
  producto('Lenteja a granel', 'Abarrotes', 'KG', '4.00', '6.00', '18.000'),
  producto('Frijol canario', 'Abarrotes', 'KG', '5.00', '7.50', '12.000'),
  producto('Aceite vegetal 1 L', 'Abarrotes', 'UND', '6.00', '8.50', '24.000'),
  producto(
    'Fideos espagueti 500 g',
    'Abarrotes',
    'UND',
    '2.00',
    '3.20',
    '30.000',
  ),
  producto('Sal de mesa 1 kg', 'Abarrotes', 'UND', '1.00', '1.80', '20.000'),
  producto('Avena 500 g', 'Abarrotes', 'UND', '2.50', '4.00', '16.000'),
  producto('Agua sin gas 625 ml', 'Bebidas', 'UND', '0.80', '1.50', '48.000'),
  producto(
    'Agua sin gas caja de 12',
    'Bebidas',
    'CJA',
    '9.00',
    '15.00',
    '10.000',
  ),
  producto('Gaseosa cola 1.5 L', 'Bebidas', 'UND', '4.50', '6.50', '18.000'),
  producto('Jugo de naranja 1 L', 'Bebidas', 'UND', '3.00', '4.80', '12.000'),
  producto(
    'Refresco de cebada a granel',
    'Bebidas',
    'L',
    '1.20',
    '2.50',
    '8.500',
    { tipo: 'Refrigerado' },
  ),
  producto(
    'Atún en conserva 170 g',
    'Conservas',
    'UND',
    '3.50',
    '5.50',
    '24.000',
  ),
  producto(
    'Duraznos en almíbar 820 g',
    'Conservas',
    'UND',
    '6.00',
    '8.50',
    '8.000',
  ),
  producto(
    'Pan de molde integral',
    'Panadería',
    'UND',
    '4.00',
    '6.50',
    '8.000',
    { tipo: 'Fresco' },
  ),
  producto(
    'Galletas de vainilla paquete',
    'Snacks',
    'PQT',
    '0.70',
    '1.20',
    '40.000',
  ),
  producto(
    'Papas fritas bolsa 150 g',
    'Snacks',
    'UND',
    '2.80',
    '4.50',
    '20.000',
  ),
  producto(
    'Helado de vainilla 1 L',
    'Congelados',
    'UND',
    '7.00',
    '11.00',
    '10.000',
    { tipo: 'Congelado' },
  ),
  producto(
    'Arvejas congeladas 500 g',
    'Congelados',
    'UND',
    '3.00',
    '5.00',
    '12.000',
    { tipo: 'Congelado' },
  ),
  producto(
    'Detergente en polvo 800 g',
    'Limpieza',
    'UND',
    '5.00',
    '7.50',
    '18.000',
    { tipo: 'Hogar' },
  ),
  producto('Lejía 1 L', 'Limpieza', 'UND', '2.00', '3.50', '24.000', {
    tipo: 'Hogar',
  }),
  producto('Lavavajillas 500 g', 'Limpieza', 'UND', '3.00', '4.80', '14.000', {
    tipo: 'Hogar',
  }),
  producto('Guantes de limpieza', 'Limpieza', 'PAR', '2.00', '4.00', '10.000', {
    tipo: 'Hogar',
  }),
  producto(
    'Papel higiénico paquete de 4',
    'Cuidado personal',
    'PQT',
    '3.00',
    '5.00',
    '20.000',
    { tipo: 'Higiene' },
  ),
  producto(
    'Jabón de tocador 90 g',
    'Cuidado personal',
    'UND',
    '1.50',
    '2.50',
    '30.000',
    { tipo: 'Higiene' },
  ),
  producto(
    'Champú familiar 400 ml',
    'Cuidado personal',
    'UND',
    '7.00',
    '10.50',
    '12.000',
    { tipo: 'Higiene' },
  ),
  producto('Cuerda por metro', 'Ferretería', 'M', '0.50', '1.20', '50.000', {
    tipo: 'Hogar',
  }),
  producto(
    'Producto descontinuado',
    'Abarrotes',
    'UND',
    '1.00',
    '2.00',
    '0.000',
    { estado: false, sinAsignar: true },
  ),
  producto(
    'Producto sin asignar a sucursal',
    'Abarrotes',
    'UND',
    '1.00',
    '2.00',
    '0.000',
    { sinAsignar: true },
  ),
  producto(
    'Producto inactivo en sucursal',
    'Abarrotes',
    'UND',
    '1.00',
    '2.00',
    '5.000',
    { estadoSucursal: false },
  ),
  producto(
    'Producto pendiente de precio',
    'Abarrotes',
    'UND',
    '1.00',
    '0.00',
    '5.000',
  ),
];

export async function seedProductosTest(
  prisma: PrismaClient,
  tipos: Map<string, number>,
  categorias: Map<string, number>,
  unidades: Map<string, number>,
) {
  const ids = new Map<string, number>();
  for (const item of productosTest) {
    const nombre = PREFIJO_TEST + item.nombre;
    const existente = await prisma.producto.findFirst({
      where: { nombre },
      orderBy: { idProducto: 'asc' },
    });
    const row =
      existente ??
      (await prisma.producto.create({
        data: {
          nombre,
          detalle: item.detalle,
          codigoBarras: item.codigoBarras,
          estado: item.estado,
          idTipoProducto: idRequerido(tipos, item.tipo),
          idCategoria: idRequerido(categorias, item.categoria),
          idUnidadMedida: idRequerido(unidades, item.unidad),
        },
      }));
    ids.set(item.nombre, row.idProducto);
  }
  return ids;
}
