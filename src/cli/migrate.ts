#!/usr/bin/env node

import { Pool } from 'pg';
import { MigrationRunner, createMigrationTemplate } from '../migrations';
import { logger } from '../logger';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!DATABASE_URL) {
    logger.error('DATABASE_URL not configured');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const runner = new MigrationRunner(pool, './migrations');

    switch (command) {
      case 'init':
        await runner.init();
        logger.info('Migrations initialized');
        break;

      case 'up':
        await runner.init();
        const up_count = await runner.up();
        logger.info(`Ran ${up_count} migrations`);
        break;

      case 'down':
        const steps = parseInt(args[0]) || 1;
        const down_count = await runner.down(steps);
        logger.info(`Rolled back ${down_count} migrations`);
        break;

      case 'status':
        const status = await runner.getStatus();
        console.log('\nMigration Status:');
        console.log('================');
        console.log(`\nExecuted (${status.executed.length}):`);
        status.executed.forEach((m: string) => console.log(`  ✓ ${m}`));
        console.log(`\nPending (${status.pending.length}):`);
        status.pending.forEach((m: string) => console.log(`  ○ ${m}`));
        console.log(`\nLast Batch: ${status.lastBatch}\n`);
        break;

      case 'create':
        const name = args[0];
        if (!name) {
          logger.error('Migration name required: migrate create <name>');
          process.exit(1);
        }

        const template = createMigrationTemplate(name);
        const timestamp = Date.now();
        const filename = join('./migrations', `${timestamp}_${name}.ts`);

        await writeFile(filename, template);
        logger.info(`Created migration: ${filename}`);
        break;

      default:
        console.log(`
Usage: npm run migrate <command> [args]

Commands:
  init                  Initialize migration table
  up                    Run pending migrations
  down [steps]          Rollback migrations (default 1)
  status                Show migration status
  create <name>         Create new migration template

Examples:
  npm run migrate init
  npm run migrate up
  npm run migrate down 2
  npm run migrate status
  npm run migrate create add_users_table
        `);
        process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  logger.error('Migration failed', { meta: { error: String(error) } });
  process.exit(1);
});
