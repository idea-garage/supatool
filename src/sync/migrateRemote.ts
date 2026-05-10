import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

const MIGRATIONS_TABLE = '_supatool_migrations';

export interface MigrateRemoteOptions {
  connectionString: string;
  migrationsDir: string;
  dryRun?: boolean;
}

/**
 * Apply pending SQL migration files to remote DB.
 *
 * Tracks applied migrations in _supatool_migrations table.
 * Files are applied in alphabetical order (timestamp or sequential naming).
 */
export async function migrateRemote(options: MigrateRemoteOptions): Promise<void> {
  const { connectionString, migrationsDir, dryRun = false } = options;

  // Collect .sql files
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (allFiles.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Get already-applied migrations
    const applied = await client.query<{ filename: string }>(
      `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename`
    );
    const appliedSet = new Set(applied.rows.map(r => r.filename));

    const pending = allFiles.filter(f => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log('✅ All migrations already applied.');
      return;
    }

    console.log(`Pending migrations: ${pending.length}`);
    for (const f of pending) {
      console.log(`  • ${f}`);
    }

    if (dryRun) {
      console.log('\n(dry-run) No changes applied.');
      return;
    }

    // Apply each pending migration in a transaction
    for (const filename of pending) {
      const filepath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filepath, 'utf-8');

      process.stdout.write(`Applying ${filename}... `);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
          [filename]
        );
        await client.query('COMMIT');
        console.log('✅');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌');
        throw err;
      }
    }

    console.log(`\n✅ Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}
