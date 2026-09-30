import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../src/generated/prisma/client.js'; 

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurado');
}

const url = new URL(process.env.DATABASE_URL);
const allowPublicKeyRetrieval =
  process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL !== 'false';

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.substring(1)),
  connectionLimit: 5,
  allowPublicKeyRetrieval,
});

export const prisma = new PrismaClient({
  adapter,
});
