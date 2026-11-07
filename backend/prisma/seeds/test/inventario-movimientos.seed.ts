import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { LogisticaService } from '../../../src/modules/logistica/logistica.service.js';
import type { PrismaService } from '../../../src/database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../../src/common/types/usuario-autenticado.js';
import { idRequerido } from '../contexto-test.js';
export const movimientosTest = [
  {
    producto: 'Arroz a granel',
    tipo: 2,
    cantidad: '5.000',
    observacion: 'Ingreso de arroz',
  },
  {
    producto: 'Azúcar bolsa 1 kg',
    tipo: 3,
    cantidad: '2.000',
    observacion: 'Ajuste por conteo de azúcar',
  },
  {
    producto: 'Pollo fresco',
    tipo: 4,
    cantidad: '0.500',
    observacion: 'Merma de pollo',
  },
  {
    producto: 'Pan francés',
    tipo: 4,
    cantidad: '2.000',
    observacion: 'Merma de pan',
  },
  {
    producto: 'Tomate italiano',
    tipo: 4,
    cantidad: '0.750',
    observacion: 'Merma de tomate',
  },
  {
    producto: 'Leche entera 1 L',
    tipo: 2,
    cantidad: '6.000',
    observacion: 'Reposición de leche',
  },
  {
    producto: 'Huevo rosado por unidad',
    tipo: 3,
    cantidad: '3.000',
    observacion: 'Ajuste de huevos',
  },
] as const;
export async function seedInventarioMovimientosTest(
  prisma: PrismaClient,
  actor: UsuarioAutenticado,
  inventarios: Map<string, number>,
) {
  const servicio = new LogisticaService(prisma as unknown as PrismaService);
  for (const item of movimientosTest) {
    const idInventario = idRequerido(inventarios, item.producto);
    if (
      await prisma.inventarioMovimiento.findFirst({
        where: { idInventario, observacion: item.observacion },
      })
    )
      continue;
    await servicio.crearMovimiento(
      {
        idInventario,
        idTipoMovimiento: item.tipo,
        cantidad: item.cantidad,
        observacion: item.observacion,
      },
      actor,
    );
  }
}
