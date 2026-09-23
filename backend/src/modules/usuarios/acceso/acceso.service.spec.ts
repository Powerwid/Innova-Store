import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import { AccesoService } from './acceso.service.js';

const actor = (roles: string[]): UsuarioAutenticado => ({
  idUsuario: 1,
  correo: 'actor@ejemplo.com',
  estado: 'ACTIVO',
  roles,
  permisos: ['PERMISOS_ASIGNAR'],
});

describe('AccesoService', () => {
  it('rechaza cambios de permisos hechos por quien no es SUPERADMIN', async () => {
    const prisma = { rol: { findUnique: vi.fn() }, permiso: { findUnique: vi.fn() } };
    const service = new AccesoService(prisma as unknown as PrismaService);
    await expect(service.asignarPermiso(actor(['ADMIN']), 1, 1)).rejects.toThrow();
    expect(prisma.rol.findUnique).not.toHaveBeenCalled();
  });

  it('impide retirar el último SUPERADMIN activo', async () => {
    const deleteAssignment = vi.fn();
    const prisma = {
      rol: { findUnique: vi.fn().mockResolvedValue({ idRol: 1, nombre: 'SUPERADMIN' }) },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => callback({
        usuarioRol: {
          findUnique: vi.fn().mockResolvedValue({ idUsuario: 1, idRol: 1 }),
          count: vi.fn().mockResolvedValue(1),
          delete: deleteAssignment,
        },
        usuario: { findUnique: vi.fn().mockResolvedValue({ estado: { nombre: 'ACTIVO' } }) },
      })),
    };
    const service = new AccesoService(prisma as unknown as PrismaService);
    await expect(service.quitarRol(actor(['SUPERADMIN']), 1, 1)).rejects.toThrow();
    expect(deleteAssignment).not.toHaveBeenCalled();
  });
});
