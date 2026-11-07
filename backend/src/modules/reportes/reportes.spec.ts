import { describe, expect, it, vi } from 'vitest';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import type { PrismaService } from '../../database/prisma/prisma.service.js';
import { ConsultaReporteSchema } from './reportes.definition.js';
import { ReportesService, fechaPeru, periodoPeru } from './reportes.service.js';

describe('Reportes: validación y alcance', () => {
  const actor: UsuarioAutenticado = {
    idUsuario: 1,
    correo: 'reportes@example.test',
    estado: 'ACTIVO',
    rol: { idRol: 1, nombre: 'ADMIN' },
    permisos: ['VENTAS_VER'],
    sucursales: [1],
  };
  const q = ConsultaReporteSchema.parse({
    idSucursal: 1,
    desde: '2026-10-08',
    hasta: '2026-10-08',
  });
  it('interpreta los días del minimarket en Perú, incluido el fin exclusivo', () => {
    expect(fechaPeru(new Date('2026-10-09T03:00:00Z'))).toBe('2026-10-08');
    expect(periodoPeru('2026-10-08', '2026-10-08')).toEqual({
      inicio: new Date('2026-10-08T05:00:00Z'),
      fin: new Date('2026-10-09T05:00:00Z'),
    });
  });
  it.each([
    { desde: '2026-02-30', hasta: '2026-03-01' },
    { desde: '2026-10-08', hasta: '2026-10-07' },
    { desde: '2025-01-01', hasta: '2026-10-08' },
    { desde: '2026-10-08' },
    { pagina: 0 },
    { limite: 101 },
  ])('rechaza consultas inválidas %j', (input) => {
    expect(ConsultaReporteSchema.safeParse(input).success).toBe(false);
  });
  it('rechaza permisos, sucursales y filtros incompatibles antes de acceder a la base', async () => {
    const transaction = vi.fn();
    const service = new ReportesService({
      $transaction: transaction,
    } as unknown as PrismaService);
    await expect(
      service.obtener('ventas', { ...q, idSucursal: 2 }, actor),
    ).rejects.toThrow('sucursal');
    await expect(service.obtener('compras', q, actor)).rejects.toThrow(
      'permiso',
    );
    await expect(
      service.obtener(
        'ventas',
        { ...q, desde: undefined, hasta: undefined },
        actor,
      ),
    ).rejects.toThrow('fecha');
    await expect(
      service.obtener('ventas', { ...q, estado: 'vencida' }, actor),
    ).rejects.toThrow('estado');
    await expect(
      service.obtener('inventario', q, {
        ...actor,
        permisos: ['LOGISTICA_VER'],
      }),
    ).rejects.toThrow('histórico');
    expect(transaction).not.toHaveBeenCalled();
  });
});
