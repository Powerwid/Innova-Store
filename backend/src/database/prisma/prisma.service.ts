import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    constructor(configService: ConfigService) {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
            throw new Error('DATABASE_URL no está configurado');
        }

        const url = new URL(databaseUrl);

        const adapter = new PrismaMariaDb({
            host: url.hostname,
            port: Number(url.port || 3306),
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: decodeURIComponent(url.pathname.substring(1)),
            connectionLimit: 10,
        });

        super({
            adapter,
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}