import { describe, expect, it, vi } from 'vitest';
import { PermisoSistema } from '../../../common/enums/permiso-sistema.enum.js';
import { RolSistema } from '../../../common/enums/rol-sistema.enum.js';
import type { UsuarioAutenticado } from '../../../common/types/usuario-autenticado.js';
import type { PrismaService } from '../../../database/prisma/prisma.service.js';
import { AccesoService } from './acceso.service.js';
import { SincronizarPermisosSchema } from './dto/acceso.dto.js';

const actorSuperadmin = (): UsuarioAutenticado => ({
  idUsuario: 1,
  correo: 'actor@ejemplo.com',
  estado: 'ACTIVO',
  rol: { idRol: 1, nombre: RolSistema.SUPERADMIN },
  permisos: [],
  sucursales: [],
});

describe('AccesoService', () => {
  it('valida la lista de permisos con mensajes específicos', () => {
    const repetidos = SincronizarPermisosSchema.safeParse({ idsPermisos: [1, 1] });
    const invalido = SincronizarPermisosSchema.safeParse({ idsPermisos: [0] });
    const vacio = SincronizarPermisosSchema.safeParse({ idsPermisos: [] });

    expect(repetidos.error?.issues[0]?.message).toBe(
      'La lista de permisos no puede contener identificadores repetidos',
    );
    expect(invalido.error?.issues[0]?.message).toBe(
      'Cada identificador de permiso debe ser mayor que cero',
    );
    expect(vacio.success).toBe(true);
  });

  it('sincroniza todos los permisos del rol en una transacción', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      rol: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ idRol: 2, nombre: 'ADMIN', activo: true })
          .mockResolvedValueOnce({
            idRol: 2,
            nombre: 'ADMIN',
            activo: true,
            permisos: [{
              permiso: {
                idPermiso: 10,
                nombre: PermisoSistema.USUARIOS_VER,
              },
            }],
            _count: { usuarios: 3, permisos: 1 },
          }),
      },
      permiso: {
        findMany: vi.fn().mockResolvedValue([{ idPermiso: 10 }]),
      },
      rolPermiso: { deleteMany, createMany },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new AccesoService(prisma as unknown as PrismaService);

    const resultado = await service.sincronizarPermisos(2, [10]);

    expect(deleteMany).toHaveBeenCalledWith({ where: { idRol: 2 } });
    expect(createMany).toHaveBeenCalledWith({
      data: [{ idRol: 2, idPermiso: 10 }],
    });
    expect(resultado.rol.cantidadUsuarios).toBe(3);
    expect(resultado.rol.permisos[0]?.etiqueta).toBe('Ver usuarios');
  });

  it('permite quitar todos los permisos de un rol', async () => {
    const createMany = vi.fn();
    const tx = {
      rol: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ idRol: 2, nombre: 'CAJERO', activo: true })
          .mockResolvedValueOnce({
            idRol: 2,
            nombre: 'CAJERO',
            activo: true,
            permisos: [],
            _count: { usuarios: 0, permisos: 0 },
          }),
      },
      permiso: { findMany: vi.fn() },
      rolPermiso: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
        createMany,
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new AccesoService(prisma as unknown as PrismaService);

    const resultado = await service.sincronizarPermisos(2, []);

    expect(tx.permiso.findMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
    expect(resultado.rol.cantidadPermisos).toBe(0);
  });

  it('rechaza la sincronización si algún permiso no existe', async () => {
    const deleteMany = vi.fn();
    const tx = {
      rol: {
        findUnique: vi.fn().mockResolvedValue({ idRol: 2, nombre: 'ADMIN', activo: true }),
      },
      permiso: {
        findMany: vi.fn().mockResolvedValue([{ idPermiso: 10 }]),
      },
      rolPermiso: { deleteMany, createMany: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new AccesoService(prisma as unknown as PrismaService);

    await expect(service.sincronizarPermisos(2, [10, 99])).rejects.toThrow(
      'No existen los permisos con identificadores: 99',
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('impide eliminar un rol que tiene usuarios asignados', async () => {
    const eliminar = vi.fn();
    const tx = {
      rol: {
        findUnique: vi.fn().mockResolvedValue({
          idRol: 2,
          nombre: 'ADMIN',
          _count: { usuarios: 5 },
        }),
        delete: eliminar,
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new AccesoService(prisma as unknown as PrismaService);

    await expect(service.eliminarRol(2)).rejects.toThrow(
      'No se puede eliminar el rol porque tiene 5 usuario(s) asignado(s)',
    );
    expect(eliminar).not.toHaveBeenCalled();
  });

  it('elimina un rol sin usuarios asignados', async () => {
    const eliminar = vi.fn().mockResolvedValue({ idRol: 2 });
    const tx = {
      rol: {
        findUnique: vi.fn().mockResolvedValue({
          idRol: 2,
          nombre: 'CAJERO',
          _count: { usuarios: 0 },
        }),
        delete: eliminar,
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new AccesoService(prisma as unknown as PrismaService);

    await expect(service.eliminarRol(2)).resolves.toMatchObject({
      rol: { idRol: 2, nombre: 'CAJERO' },
    });
    expect(eliminar).toHaveBeenCalledWith({ where: { idRol: 2 } });
  });

  it('impide retirar el último SUPERADMIN activo', async () => {
    const updateUser = vi.fn();
    const prisma = {
      rol: {
        findUnique: vi.fn().mockResolvedValue({
          idRol: 2,
          nombre: 'ADMIN',
          activo: true,
        }),
      },
      usuario: {
        findUnique: vi.fn().mockResolvedValue({
          idUsuario: 2,
          idRol: 1,
          estado: { nombre: 'ACTIVO' },
          rol: { nombre: RolSistema.SUPERADMIN },
        }),
      },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => callback({
        usuario: {
          count: vi.fn().mockResolvedValue(1),
          update: updateUser,
        },
      })),
    };
    const service = new AccesoService(prisma as unknown as PrismaService);

    await expect(
      service.cambiarRolUsuario(actorSuperadmin(), 2, 2),
    ).rejects.toThrow('No se puede quitar el último SUPERADMIN activo');
    expect(updateUser).not.toHaveBeenCalled();
  });
});
