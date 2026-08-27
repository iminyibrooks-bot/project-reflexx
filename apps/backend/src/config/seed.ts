/*
Database seeder script

Usage:
  - Set DATABASE_URL and SEED_DB_TYPE ("prisma" or "pg") in your environment (e.g., .env)
  - Run with ts-node or compile + run with node

Examples:
  SEED_DB_TYPE=prisma DATABASE_URL="file:./dev.db" ts-node apps/backend/src/config/seed.ts
  SEED_DB_TYPE=pg DATABASE_URL=postgres://user:pass@localhost:5432/db ts-node apps/backend/src/config/seed.ts

Notes:
  - This script uses dynamic imports so it won't fail at import time if your project doesn't use Prisma or pg.
  - Add more seed entries and adjust SQL/ORM calls to match your schema.
*/

import 'dotenv/config';

const SEED_DB_TYPE = process.env.SEED_DB_TYPE || 'prisma';

async function seedPrisma() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    console.log('Seeding via Prisma...');

    // Example seed data — adapt these to your schema
    await prisma.user.upsert({
      where: { email: 'seed@local' },
      update: {},
      create: { email: 'seed@local', name: 'Seed User' },
    });

    console.log('Prisma seeding complete.');
  } finally {
    await prisma.$disconnect();
  }
}

async function seedPg() {
  const { Client } = await import('pg');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL must be set for pg seeding');

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Seeding via pg...');

    // Example SQL — ensure your table/schema exists and adjust columns as needed
    await client.query(
      `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email text UNIQUE, name text);
       INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING;`,
      ['seed@local', 'Seed User']
    );

    console.log('pg seeding complete.');
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(`Starting seed (type=${SEED_DB_TYPE})`);

  if (SEED_DB_TYPE === 'prisma') {
    try {
      await seedPrisma();
    } catch (err) {
      console.error('Prisma seed failed:', err);
      process.exitCode = 1;
    }
  } else if (SEED_DB_TYPE === 'pg') {
    try {
      await seedPg();
    } catch (err) {
      console.error('pg seed failed:', err);
      process.exitCode = 1;
    }
  } else {
    console.error('Unknown SEED_DB_TYPE:', SEED_DB_TYPE);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default main;
