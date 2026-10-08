import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { LogisticaService } from '../../../src/modules/logistica/logistica.service.js';
import type { PrismaService } from '../../../src/database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../../src/common/types/usuario-autenticado.js';
import { idRequerido } from '../contexto-test.js';
import { productosTest } from './productos.seed.js';
export async function seedInventariosTest(
  prisma: PrismaClient,
  actor: UsuarioAutenticado,
  asignaciones: Map<string, number>,
  almacenes: Map<string, number>,
) {
  const servicio = new LogisticaService(prisma as unknown as PrismaService);
  const ids = new Map<string, number>();
  async function asegurar(
    idProductoSucursal: number,
    idAlmacen: number,
    stockMinimo: string,
    stockInicial: string,
  ) {
    const existente = await prisma.inventario.findUnique({
      where: {
        idProductoSucursal_idAlmacen: { idProductoSucursal, idAlmacen },
      },
    });
    // Conserva el movimiento inicial y el stock en la misma transacción del servicio.
    return (
      existente ??
      servicio.crearInventario(
        { idProductoSucursal, idAlmacen, stockMinimo, stockInicial },
        actor,
      )
    );
  }
  for (const item of productosTest.filter(
    (item) => !item.sinAsignar && item.estadoSucursal,
  )) {
    const asignacion = idRequerido(asignaciones, item.nombre);
    const row = await asegurar(
      asignacion,
      idRequerido(almacenes, 'Mostrador'),
      item.stockMinimo,
      item.stockInicial,
    );
    ids.set(item.nombre, row.idInventario);
    if (
      [
        'Arroz a granel',
        'Agua sin gas 625 ml',
        'Leche entera 1 L',
        'Detergente en polvo 800 g',
      ].includes(item.nombre)
    )
      await asegurar(
        asignacion,
        idRequerido(almacenes, 'Depósito'),
        '5.000',
        '10.000',
      );
  }
  return ids;
}
