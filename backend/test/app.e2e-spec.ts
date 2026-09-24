import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma/prisma.service.js';
import { DecolectaClient } from '../src/modules/documentos/decolecta.client.js';
import { PERMISOS_SISTEMA } from '../src/common/constants/permisos-sistema.js';

describe('Autenticación y autorización (HTTP)', () => {
  let app: INestApplication;
  let adminAgent: ReturnType<typeof request.agent>;
  let superadminAgent: ReturnType<typeof request.agent>;
  let refreshCookie: string;
  let adminPermisos = ['USUARIOS_VER'];
  const superadminPermisos = PERMISOS_SISTEMA.map(({ nombre }) => nombre);
  let estadoUsuarioTres = 'INACTIVO';
  const previousSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'secreto-de-pruebas-local-con-longitud-suficiente';
    const hash = await bcrypt.hash('ClaveSegura1', 4);
    const prisma = {
      usuario: {
        findUnique: async ({ where }: { where: { correo?: string; idUsuario?: number } }) => {
          const id = where.idUsuario ?? (where.correo === 'admin@ejemplo.com' ? 1 : 2);
          if (!where.idUsuario && !['admin@ejemplo.com', 'superadmin@ejemplo.com'].includes(where.correo ?? '')) {
            return null;
          }
          const esSuperadmin = id === 2;
          return {
            idUsuario: id,
            idEstado: id === 3 && estadoUsuarioTres === 'INACTIVO' ? 2 : 1,
            correo: esSuperadmin ? 'superadmin@ejemplo.com' : 'admin@ejemplo.com',
            contrasena: hash,
            estado: { nombre: id === 3 ? estadoUsuarioTres : 'ACTIVO' },
            idRol: esSuperadmin ? 1 : 2,
            rol: {
              idRol: esSuperadmin ? 1 : 2,
              nombre: esSuperadmin ? 'SUPERADMIN' : 'ADMIN',
              activo: true,
              permisos: (esSuperadmin ? superadminPermisos : adminPermisos)
                .map((nombre) => ({ permiso: { nombre } })),
            },
            sucursales: [],
          };
        },
        findFirst: async ({ where }: { where: { idUsuario: number } }) =>
          where.idUsuario === 2 ? { idUsuario: 2 } : null,
        findMany: async () => [],
      },
      estado: {
        findUnique: async ({ where }: { where: { nombre: string } }) => ({
          idEstado: where.nombre === 'ACTIVO' ? 1 : 2,
          nombre: where.nombre,
        }),
      },
      tipoDocumento: {
        findUnique: async ({ where }: { where: { nombre: string } }) => ({
          idTipoDocumento: where.nombre === 'DNI' ? 1 : 2,
          activo: true,
        }),
      },
      $transaction: async (callback: (tx: {
        usuario: { update: (args: { data: { idEstado?: number } }) => Promise<void> };
        rol: {
          findUnique: () => Promise<null>;
          delete: () => Promise<void>;
        };
      }) => Promise<unknown>) => callback({
        usuario: {
          update: async ({ data }) => {
            estadoUsuarioTres = data.idEstado === 1 ? 'ACTIVO' : 'INACTIVO';
          },
        },
        rol: {
          findUnique: async () => null,
          delete: async () => undefined,
        },
      }),
      rol: { findMany: async () => [] },
    };

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(DecolectaClient)
      .useValue({
        consultar: async () => ({
          first_name: 'JOSEPH KLEYN',
          first_last_name: 'MAMANI',
          second_last_name: 'PEREZ',
          document_number: '12345678',
        }),
      })
      .compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    adminAgent = request.agent(app.getHttpServer());
    superadminAgent = request.agent(app.getHttpServer());
    const admin = await adminAgent
      .post('/api/auth/login')
      .send({ correo: 'admin@ejemplo.com', contrasena: 'ClaveSegura1' })
      .expect(200);
    expect(admin.body.accessToken).toBeUndefined();
    const cookies = admin.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((cookie) => cookie.startsWith('access_token=') && cookie.includes('HttpOnly'))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token=') && cookie.includes('HttpOnly') && cookie.includes('Path=/api'))).toBe(true);
    const superadmin = await superadminAgent
      .post('/api/auth/login')
      .send({ correo: 'superadmin@ejemplo.com', contrasena: 'ClaveSegura1' })
      .expect(200);
    const superadminCookies = superadmin.headers['set-cookie'] as unknown as string[];
    refreshCookie = superadminCookies.find((cookie) => cookie.startsWith('refresh_token='))!.split(';')[0];
  });

  afterAll(async () => {
    await app?.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('cierra usuarios sin JWT', () =>
    request(app.getHttpServer()).get('/api/usuarios').expect(401));

  it('permite un permiso dinámico y lo revoca con la misma cookie', async () => {
    await adminAgent
      .get('/api/usuarios')
      .expect(200);
    adminPermisos = ['DASHBOARD_VER'];
    await adminAgent
      .get('/api/usuarios')
      .expect(403);
  });

  it('reserva la administración de roles para SUPERADMIN', async () => {
    await adminAgent
      .get('/api/roles')
      .expect(403);
    const respuesta = await superadminAgent
      .get('/api/roles')
      .expect(200);
    expect(respuesta.body).toEqual([]);
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('protege la consulta de documentos y devuelve campos listos para el formulario', async () => {
    await adminAgent.get('/api/documentos/dni/12345678').expect(403);
    const respuesta = await superadminAgent
      .get('/api/documentos/dni/12345678')
      .expect(200);
    expect(respuesta.body).toMatchObject({
      nombres: 'Joseph Kleyn',
      apellidos: 'Mamani Perez',
      nombreCompleto: 'Joseph Kleyn Mamani Perez',
      numeroDocumento: '12345678',
    });
  });

  it('renueva la cookie de acceso mediante la cookie de renovación', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    const cookies = respuesta.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(false);
    const protegida = await request(app.getHttpServer())
      .get('/api/roles')
      .set('Cookie', refreshCookie)
      .expect(200);
    expect((protegida.headers['set-cookie'] as unknown as string[])
      .some((cookie) => cookie.startsWith('access_token='))).toBe(true);
  });

  it('renueva automáticamente un acceso expirado al ejecutar la siguiente petición', async () => {
    const jwt = app.get(JwtService);
    const expiredAccess = await jwt.signAsync(
      { sub: 2, tipo: 'access' },
      { expiresIn: -1 },
    );
    const respuesta = await request(app.getHttpServer())
      .get('/api/roles')
      .set('Cookie', `access_token=${expiredAccess}; ${refreshCookie}`)
      .expect(200);
    expect((respuesta.headers['set-cookie'] as unknown as string[])
      .some((cookie) => cookie.startsWith('access_token='))).toBe(true);
  });

  it('rechaza tokens manipulados o una renovación expirada', async () => {
    await request(app.getHttpServer())
      .get('/api/roles')
      .set('Cookie', `access_token=token-invalido; ${refreshCookie}`)
      .expect(401);

    const expiredRefresh = await app.get(JwtService).signAsync(
      { sub: 2, tipo: 'refresh' },
      { expiresIn: -1 },
    );
    await request(app.getHttpServer())
      .get('/api/roles')
      .set('Cookie', `refresh_token=${expiredRefresh}`)
      .expect(401);
  });

  it('habilita y deshabilita usuarios desde PATCH con permisos por campo', async () => {
    const activado = await superadminAgent
      .patch('/api/usuarios/3')
      .send({ estado: 'ACTIVO' })
      .expect(200);
    expect(activado.body.usuario.estado.nombre).toBe('ACTIVO');

    adminPermisos = ['USUARIOS_EDITAR'];
    await adminAgent
      .patch('/api/usuarios/3')
      .send({ estado: 'INACTIVO' })
      .expect(403);

    const desactivado = await superadminAgent
      .patch('/api/usuarios/3')
      .send({ estado: 'INACTIVO' })
      .expect(200);
    expect(desactivado.body.usuario.estado.nombre).toBe('INACTIVO');

    await superadminAgent.delete('/api/usuarios/3').expect(404);
    await superadminAgent.delete('/api/roles/3').expect(404);
    await superadminAgent.patch('/api/usuarios/2')
      .send({ estado: 'INACTIVO' })
      .expect(403);
  });

  it('borra ambas cookies al cerrar sesión', async () => {
    const respuesta = await superadminAgent.post('/api/auth/logout').expect(200);
    const cookies = respuesta.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(true);
    await superadminAgent.get('/api/roles').expect(401);
  });
});
