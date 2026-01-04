// prisma/prisma.config.ts – نسخه رسمی Prisma 7

import 'dotenv/config'  // لود .env خودکار
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'schema.prisma',  // مسیر schema
  migrations: {
    path: 'migrations',     // مسیر migrations
    // seed: 'tsx seed.ts',  // اگر seed داری، uncomment کن
  },
  datasource: {
    url: env('DATABASE_URL'),  // ← URL دیتابیس (Neon/PostgreSQL) اینجا
    // shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),  // اگر shadow db نیاز داری
  },
})