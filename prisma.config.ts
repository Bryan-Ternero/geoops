import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // direct connection, no pooler: pgbouncer in transaction mode cannot run migrations
    url: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://geoops:geoops@localhost:5432/geoops',
  },
});