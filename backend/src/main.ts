import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');

  const publicPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const indexPath = join(publicPath, 'index.html');
  if (existsSync(indexPath)) {
    app.useStaticAssets(publicPath);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (
        req.method !== 'GET' ||
        req.path.startsWith('/api') ||
        extname(req.path) ||
        !req.accepts('html')
      ) {
        return next();
      }
      res.sendFile(indexPath, (error) => {
        if (error) next(error);
      });
    });
  }
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
