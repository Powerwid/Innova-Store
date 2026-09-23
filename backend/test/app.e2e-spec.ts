import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma/prisma.service.js';

describe('Autenticación y autorización (HTTP)', () => {
  let app: INestApplication;
  let adminToken: string;
  let superadminToken: string;
  let adminPermisos = ['USUARIOS_VER', 'PERMISOS_ASIGNAR'];
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
            correo: esSuperadmin ? 'superadmin@ejemplo.com' : 'admin@ejemplo.com',
            contrasena: hash,
            estado: { nombre: 'ACTIVO' },
            roles: [{ rol: {
              nombre: esSuperadmin ? 'SUPERADMIN' : 'ADMIN',
              permisos: (esSuperadmin ? [] : adminPermisos).map((nombre) => ({ permiso: { nombre } })),
            } }],
          };
        },
        findMany: async () => [],
      },
      rol: { findMany: async () => [] },
    };

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();

    const admin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'admin@ejemplo.com', contrasena: 'ClaveSegura1' })
      .expect(200);
    adminToken = admin.body.accessToken as string;
    const superadmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'superadmin@ejemplo.com', contrasena: 'ClaveSegura1' })
      .expect(200);
    superadminToken = superadmin.body.accessToken as string;
  });

  afterAll(async () => {
    await app?.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('cierra usuarios sin JWT', () =>
    request(app.getHttpServer()).get('/usuarios').expect(401));

  it('permite un permiso dinámico y lo revoca con el mismo token', async () => {
    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    adminPermisos = ['PERMISOS_ASIGNAR'];
    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('reserva la administración de roles para SUPERADMIN', async () => {
    await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
    const respuesta = await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(200);
    expect(respuesta.body).toEqual([]);
  });
});
