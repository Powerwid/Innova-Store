import { prisma } from './cliente-prisma.js';
import { obtenerContextoTest } from './contexto-test.js';
import { seedConfiguracionesGlobalesTest } from './test/configuraciones-globales.seed.js';
import { seedTiposMovimientoInventarioTest } from './test/tipos-movimiento-inventario.seed.js';
import { seedTiposProductoTest } from './test/tipos-producto.seed.js';
import { seedCategoriasTest, categoriasTest } from './test/categorias.seed.js';
import { seedUnidadesMedidaTest } from './test/unidades-medida.seed.js';
import { seedAlmacenesTest } from './test/almacenes.seed.js';
import { seedProductosTest, productosTest } from './test/productos.seed.js';
import { seedProductoSucursalTest } from './test/producto-sucursal.seed.js';
import { seedInventariosTest } from './test/inventarios.seed.js';
import { seedInventarioMovimientosTest } from './test/inventario-movimientos.seed.js';

// Ejecutar por separado del seed base: npm run seed:test.
async function main() {
  const { actor, sucursal } = await obtenerContextoTest(prisma);
  await seedConfiguracionesGlobalesTest(prisma);
  await seedTiposMovimientoInventarioTest(prisma);
  const tipos = await seedTiposProductoTest(prisma);
  const categorias = await seedCategoriasTest(prisma);
  const unidades = await seedUnidadesMedidaTest(prisma);
  const almacenes = await seedAlmacenesTest(prisma, sucursal.idSucursal);
  const productos = await seedProductosTest(
    prisma,
    tipos,
    categorias,
    unidades,
  );
  const asignaciones = await seedProductoSucursalTest(
    prisma,
    sucursal.idSucursal,
    productos,
  );
  const inventarios = await seedInventariosTest(
    prisma,
    actor,
    asignaciones,
    almacenes,
  );
  await seedInventarioMovimientosTest(prisma, actor, inventarios);
  console.log(
    `Datos de prueba preparados en ${sucursal.nombre} (ID ${sucursal.idSucursal}).`,
  );
  console.log(
    `${productosTest.length} productos, ${categoriasTest.length} categorías, ${tipos.size} tipos y ${almacenes.size} almacenes.`,
  );
  console.log(
    'Incluye cantidades fraccionarias, presentaciones, stock bajo, agotados y productos inactivos.',
  );
}
main()
  .catch((error) => {
    console.error('Error al cargar los datos de prueba:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
