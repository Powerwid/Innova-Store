import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../prisma/seeds/cliente-prisma.js';
import type { PrismaService } from '../../database/prisma/prisma.service.js';
import { LogisticaService } from './logistica.service.js';
import { LogisticaController } from './logistica.controller.js';
import { LogisticaPrismaFilter } from './logistica.filter.js';
import { PermisosGuard } from '../../common/guards/permisos.guard.js';
import { SuperadminGuard } from '../../common/guards/superadmin.guard.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';

// Opt-in: usa fixtures propias en la DB configurada y las elimina en afterAll.
// Se simula únicamente el usuario autenticado; HTTP, validación y SQL son reales.
describe.skipIf(process.env.LOGISTICA_DB_TESTS !== '1')(
  'logística HTTP + MySQL',
  () => {
    let app: INestApplication;
    let actor: UsuarioAutenticado;
    let servicio: LogisticaService;
    let configuracionOriginal: boolean | undefined;
    const prefix = 'TEST_LOG_' + Date.now();
    let sucursalA: number,
      sucursalB: number,
      tipo: number,
      categoria: number,
      unidad: number;
    let producto: number,
      asignacion: number,
      almacen: number,
      almacenB: number,
      inventario: number;
    const inventariosCreados: number[] = [];
    const almacenesCreados: number[] = [];
    const productosCreados: number[] = [];
    const asignacionesCreadas: number[] = [];
    const base = '/api/logistica';

    beforeAll(async () => {
      const configuracion = await prisma.configuracionGlobal.findUniqueOrThrow({
        where: { nombre: 'STOCK_NEGATIVO' },
      });
      configuracionOriginal = configuracion.activo;
      await prisma.configuracionGlobal.update({
        where: { nombre: 'STOCK_NEGATIVO' },
        data: { activo: false },
      });
      const usuario = await prisma.usuario.findFirst({
        include: { rol: true, estado: true },
      });
      if (!usuario)
        throw new Error(
          'Se necesita un usuario existente para probar auditoría',
        );
      sucursalA = (
        await prisma.sucursal.create({ data: { nombre: prefix + '_A' } })
      ).idSucursal;
      sucursalB = (
        await prisma.sucursal.create({ data: { nombre: prefix + '_B' } })
      ).idSucursal;
      actor = {
        idUsuario: usuario.idUsuario,
        correo: 'prueba@example.invalid',
        estado: 'ACTIVO',
        rol: { idRol: usuario.idRol, nombre: 'SUPERADMIN' },
        permisos: ['LOGISTICA_VER', 'LOGISTICA_GESTIONAR'],
        sucursales: [sucursalA],
      };
      servicio = new LogisticaService(prisma as unknown as PrismaService);
      const module = await Test.createTestingModule({
        controllers: [LogisticaController],
        providers: [
          { provide: LogisticaService, useValue: servicio },
          LogisticaPrismaFilter,
        ],
      }).compile();
      app = module.createNestApplication();
      app.setGlobalPrefix('api');
      app.use(
        (
          req: Request & { user?: UsuarioAutenticado },
          _res: Response,
          next: NextFunction,
        ) => {
          req.user = actor;
          next();
        },
      );
      app.useGlobalGuards(
        new SuperadminGuard(new Reflector()),
        new PermisosGuard(new Reflector()),
      );
      await app.init();
    }, 30000);

    afterAll(async () => {
      await app?.close();
      if (configuracionOriginal !== undefined) {
        await prisma.configuracionGlobal.update({
          where: { nombre: 'STOCK_NEGATIVO' },
          data: { activo: configuracionOriginal },
        });
      }
      // Solo IDs de los registros creados por esta suite, nunca datos preexistentes.
      await prisma.$transaction(async (tx) => {
        await tx.inventarioMovimiento.deleteMany({
          where: { idInventario: { in: inventariosCreados } },
        });
        await tx.inventario.deleteMany({
          where: { idInventario: { in: inventariosCreados } },
        });
        await tx.productoSucursal.deleteMany({
          where: { idProductoSucursal: { in: asignacionesCreadas } },
        });
        await tx.producto.deleteMany({
          where: { idProducto: { in: productosCreados } },
        });
        await tx.almacen.deleteMany({
          where: { idAlmacen: { in: almacenesCreados } },
        });
        if (tipo)
          await tx.tipoProducto.delete({ where: { idTipoProducto: tipo } });
        if (categoria)
          await tx.categoria.delete({ where: { idCategoria: categoria } });
        if (unidad)
          await tx.unidadMedida.delete({ where: { idUnidadMedida: unidad } });
        await tx.sucursal.deleteMany({
          where: { idSucursal: { in: [sucursalA, sucursalB].filter(Boolean) } },
        });
      });
      await prisma.$disconnect();
    }, 30000);

    it('crea catálogos, producto sin código, almacén e inventario con stock inicial', async () => {
      const api = request(app.getHttpServer());
      tipo = (
        await api
          .post(base + '/tipos-producto')
          .send({ nombre: prefix })
          .expect(201)
      ).body.idTipoProducto;
      categoria = (
        await api
          .post(base + '/categorias')
          .send({ nombre: prefix, color: '#F58220' })
          .expect(201)
      ).body.idCategoria;
      unidad = (
        await api
          .post(base + '/unidades-medida')
          .send({ nombre: prefix, simbolo: String(Date.now()).slice(-10) })
          .expect(201)
      ).body.idUnidadMedida;
      producto = (
        await api
          .post(base + '/productos')
          .send({
            nombre: prefix,
            idTipoProducto: tipo,
            idCategoria: categoria,
            idUnidadMedida: unidad,
          })
          .expect(201)
      ).body.idProducto;
      productosCreados.push(producto);
      asignacion = (
        await api
          .post(base + '/producto-sucursal')
          .send({
            idProducto: producto,
            idSucursal: sucursalA,
            precioVenta: '4.50',
          })
          .expect(201)
      ).body.idProductoSucursal;
      asignacionesCreadas.push(asignacion);
      almacen = (
        await api
          .post(base + '/almacenes')
          .send({ nombre: 'Principal', idSucursal: sucursalA })
          .expect(201)
      ).body.idAlmacen;
      almacenesCreados.push(almacen);
      const creado = await api
        .post(base + '/inventarios')
        .send({
          idProductoSucursal: asignacion,
          idAlmacen: almacen,
          stockInicial: '10.500',
          stockMinimo: '2',
        })
        .expect(201);
      inventario = creado.body.idInventario;
      inventariosCreados.push(inventario);
      expect(Number(creado.body.stock)).toBe(10.5);
      const movimientos = await api
        .get(base + '/inventario-movimientos')
        .query({ idInventario: inventario })
        .expect(200);
      expect(movimientos.body.total).toBe(1);
      expect(Number(movimientos.body.data[0].stockAnterior)).toBe(0);
      expect(movimientos.body.data[0].idUsuario).toBe(actor.idUsuario);
    });

    it('lista y edita recursos; bloquea duplicados, unidad modificada y borrado con referencias', async () => {
      const api = request(app.getHttpServer());
      for (const [ruta, id] of [
        ['tipos-producto', tipo],
        ['categorias', categoria],
        ['unidades-medida', unidad],
        ['productos', producto],
        ['producto-sucursal', asignacion],
        ['almacenes', almacen],
        ['inventarios', inventario],
      ] as const) {
        await api.get(base + '/' + ruta).expect(200);
        await api.get(base + '/' + ruta + '/' + id).expect(200);
        if (ruta !== 'inventarios')
          await api.delete(base + '/' + ruta + '/' + id).expect(409);
      }
      await api
        .patch(base + '/categorias/' + categoria)
        .send({ color: '#000000' })
        .expect(200);
      await api
        .patch(base + '/inventarios/' + inventario)
        .send({ stockMinimo: '3.250' })
        .expect(200);
      await api
        .patch(base + '/productos/' + producto)
        .send({ idUnidadMedida: unidad + 100000 })
        .expect(409);
      await api
        .post(base + '/producto-sucursal')
        .send({ idProducto: producto, idSucursal: sucursalA })
        .expect(409);
      await api
        .post(base + '/inventarios')
        .send({ idProductoSucursal: asignacion, idAlmacen: almacen })
        .expect(409);
      const temporal = (
        await api
          .post(base + '/almacenes')
          .send({ idSucursal: sucursalA, nombre: 'Temporal' })
          .expect(201)
      ).body.idAlmacen;
      almacenesCreados.push(temporal);
      await api.delete(base + '/almacenes/' + temporal).expect(200);
    });

    it('rechaza modificaciones directas del stock y movimientos inválidos sin cambiar saldo', async () => {
      const api = request(app.getHttpServer());
      await api
        .patch(base + '/inventarios/' + inventario)
        .send({ stock: 100 })
        .expect(400);
      for (const cantidad of ['-1', '0', '0.0001']) {
        await api
          .post(base + '/inventario-movimientos')
          .send({ idInventario: inventario, idTipoMovimiento: 2, cantidad })
          .expect(400);
      }
      await api
        .post(base + '/inventario-movimientos')
        .send({ idInventario: inventario, idTipoMovimiento: 3, cantidad: '11' })
        .expect(409);
      await api
        .post(base + '/inventario-movimientos')
        .send({ idInventario: inventario, idTipoMovimiento: 1, cantidad: '1' })
        .expect(409);
      expect(
        Number((await api.get(base + '/inventarios/' + inventario)).body.stock),
      ).toBe(10.5);
      expect(
        await prisma.inventarioMovimiento.count({
          where: { idInventario: inventario },
        }),
      ).toBe(1);
    });

    it('serializa salidas concurrentes y calcula fracciones sin perder decimales', async () => {
      const salidas = await Promise.all([
        request(app.getHttpServer())
          .post(base + '/inventario-movimientos')
          .send({
            idInventario: inventario,
            idTipoMovimiento: 3,
            cantidad: '7',
          }),
        request(app.getHttpServer())
          .post(base + '/inventario-movimientos')
          .send({
            idInventario: inventario,
            idTipoMovimiento: 3,
            cantidad: '7',
          }),
      ]);
      expect(salidas.map((r) => r.status).sort()).toEqual([201, 409]);
      await request(app.getHttpServer())
        .post(base + '/inventario-movimientos')
        .send({
          idInventario: inventario,
          idTipoMovimiento: 2,
          cantidad: '0.125',
        })
        .expect(201);
      const row = await prisma.inventario.findUniqueOrThrow({
        where: { idInventario: inventario },
      });
      expect(row.stock.toString()).toBe('3.625');
      const ledger = await prisma.inventarioMovimiento.findMany({
        where: { idInventario: inventario },
        orderBy: { idMovimiento: 'asc' },
      });
      expect(ledger.map((m) => m.stockResultante.toString())).toEqual([
        '10.5',
        '3.5',
        '3.625',
      ]);
    });

    it('revierte el saldo si falla el registro del historial', async () => {
      await expect(
        servicio.crearMovimiento(
          { idInventario: inventario, idTipoMovimiento: 2, cantidad: '1' },
          { ...actor, idUsuario: -1 },
        ),
      ).rejects.toThrow();
      expect(
        (
          await prisma.inventario.findUniqueOrThrow({
            where: { idInventario: inventario },
          })
        ).stock.toString(),
      ).toBe('3.625');
    });

    it('activa stock negativo, registra ambos saldos y respeta el cambio al desactivarlo', async () => {
      const api = request(app.getHttpServer());
      expect(
        (
          await api
            .get(base + '/configuraciones-globales/STOCK_NEGATIVO')
            .expect(200)
        ).body.activo,
      ).toBe(false);
      expect(
        (await api.get(base + '/configuraciones-globales').expect(200)).body,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nombre: 'STOCK_NEGATIVO',
            activo: false,
          }),
        ]),
      );
      await api
        .patch(base + '/configuraciones-globales/STOCK_NEGATIVO')
        .send({ activo: true })
        .expect(200);
      const salidas = await Promise.all([
        request(app.getHttpServer())
          .post(base + '/inventario-movimientos')
          .send({
            idInventario: inventario,
            idTipoMovimiento: 3,
            cantidad: '5',
          }),
        request(app.getHttpServer())
          .post(base + '/inventario-movimientos')
          .send({
            idInventario: inventario,
            idTipoMovimiento: 3,
            cantidad: '5',
          }),
      ]);
      expect(salidas.map((r) => r.status)).toEqual([201, 201]);
      expect(
        (
          await prisma.inventario.findUniqueOrThrow({
            where: { idInventario: inventario },
          })
        ).stock.toString(),
      ).toBe('-6.375');
      const ultimo = await prisma.inventarioMovimiento.findFirstOrThrow({
        where: { idInventario: inventario },
        orderBy: { idMovimiento: 'desc' },
      });
      expect(ultimo.stockResultante.toString()).toBe('-6.375');
      await api
        .patch(base + '/configuraciones-globales/STOCK_NEGATIVO')
        .send({ activo: false })
        .expect(200);
      await api
        .post(base + '/inventario-movimientos')
        .send({
          idInventario: inventario,
          idTipoMovimiento: 3,
          cantidad: '0.125',
        })
        .expect(409);
      await api
        .post(base + '/inventario-movimientos')
        .send({ idInventario: inventario, idTipoMovimiento: 2, cantidad: '10' })
        .expect(201);
      expect(
        (
          await prisma.inventario.findUniqueOrThrow({
            where: { idInventario: inventario },
          })
        ).stock.toString(),
      ).toBe('3.625');
      await api
        .patch(base + '/configuraciones-globales/STOCK_NEGATIVO')
        .send({ activo: 'sí' })
        .expect(400);
      await api
        .patch(base + '/configuraciones-globales/NO_EXISTE')
        .send({ activo: true })
        .expect(404);
    });

    it('impide cruces entre sucursales en API y con llaves foráneas de MySQL', async () => {
      almacenB = (
        await prisma.almacen.create({
          data: { idSucursal: sucursalB, nombre: 'Principal' },
        })
      ).idAlmacen;
      almacenesCreados.push(almacenB);
      const api = request(app.getHttpServer());
      await api.get(base + '/almacenes/' + almacenB).expect(403);
      await api
        .get(base + '/inventarios')
        .query({ idSucursal: sucursalB })
        .expect(403);
      await api
        .post(base + '/inventarios')
        .send({ idProductoSucursal: asignacion, idAlmacen: almacenB })
        .expect(403);
      actor.sucursales = [sucursalA, sucursalB];
      await api
        .post(base + '/inventarios')
        .send({ idProductoSucursal: asignacion, idAlmacen: almacenB })
        .expect(400);
      await expect(
        prisma.inventario.create({
          data: {
            idProductoSucursal: asignacion,
            idAlmacen: almacenB,
            idSucursal: sucursalA,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
      actor.sucursales = [sucursalB];
      await api.get(base + '/inventarios/' + inventario).expect(403);
      await api
        .patch(base + '/producto-sucursal/' + asignacion)
        .send({ precioVenta: '10' })
        .expect(403);
      await api
        .post(base + '/inventario-movimientos')
        .send({ idInventario: inventario, idTipoMovimiento: 2, cantidad: '1' })
        .expect(403);
      expect((await api.get(base + '/inventarios')).body.total).toBe(0);
      actor.sucursales = [sucursalA];
    });

    it('bloquea movimientos con almacenes inactivos y aplica los permisos generales', async () => {
      const api = request(app.getHttpServer());
      await api
        .patch(base + '/almacenes/' + almacen)
        .send({ estado: false })
        .expect(200);
      await api
        .post(base + '/inventario-movimientos')
        .send({ idInventario: inventario, idTipoMovimiento: 2, cantidad: '1' })
        .expect(400);
      actor.permisos = ['LOGISTICA_VER'];
      await api.get(base + '/tipos-movimiento-inventario').expect(200);
      await api.get(base + '/configuraciones-globales').expect(200);
      await api
        .patch(base + '/configuraciones-globales/STOCK_NEGATIVO')
        .send({ activo: true })
        .expect(403);
      await api
        .post(base + '/categorias')
        .send({ nombre: 'No autorizado' })
        .expect(403);
      actor.permisos = ['LOGISTICA_VER', 'LOGISTICA_GESTIONAR'];
      actor.rol = { ...actor.rol, nombre: 'EMPLEADO' };
      await api
        .patch(base + '/configuraciones-globales/STOCK_NEGATIVO')
        .send({ activo: true })
        .expect(403);
      actor.rol = { ...actor.rol, nombre: 'SUPERADMIN' };
      actor.permisos = [];
      await api.get(base + '/productos').expect(403);
      actor.permisos = ['LOGISTICA_VER', 'LOGISTICA_GESTIONAR'];
    });
  },
);
