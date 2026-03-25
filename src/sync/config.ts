import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load .env / .env.local in project
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

// .env.local takes precedence
if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

export interface MigrationConfig {
  naming?: 'timestamp' | 'sequential';  // default: 'timestamp'
  dir?: string;                          // default: 'supabase/migrations'
}

export interface SyncConfig {
  connectionString?: string;
  schemaDir: string;
  tablePattern: string;
  migration?: MigrationConfig;
}

/**
 * Load settings from config file
 */
export function loadConfig(configPath?: string): Partial<SyncConfig> {
  const defaultConfigPath = path.join(process.cwd(), 'supatool.config.json');
  const finalConfigPath = configPath || defaultConfigPath;
  
  if (fs.existsSync(finalConfigPath)) {
    try {
      const configData = fs.readFileSync(finalConfigPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      console.warn(`Configuration file load error: ${finalConfigPath}`);
      return {};
    }
  }
  
  return {};
}

/**
 * Resolve final settings from env and config file
 */
export function resolveConfig(options: Partial<SyncConfig>, configPath?: string): SyncConfig {
  const fileConfig = loadConfig(configPath);

  const connectionString =
    options.connectionString ||
    process.env.SUPABASE_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    fileConfig.connectionString;

  return {
    connectionString,
    schemaDir: options.schemaDir || fileConfig.schemaDir || './supabase/schemas',
    tablePattern: options.tablePattern || fileConfig.tablePattern || '*',
    migration: fileConfig.migration
  };
}

/**
 * Generate config file template (no connection string — use .env.local)
 */
export function createConfigTemplate(outputPath: string): void {
  const template = {
    schemaDir: "./supabase/schemas",
    tablePattern: "*",
    migration: {
      naming: "timestamp",
      "_naming_comment": "Use 'sequential' for NNN_description.sql format, 'timestamp' for YYYYMMDDHHMMSS_description.sql",
      dir: "supabase/migrations"
    },
    "_comment": "Set credentials in .env.local — never put secrets in this file."
  };

  fs.writeFileSync(outputPath, JSON.stringify(template, null, 2), 'utf-8');
  console.log(`Config template generated: ${outputPath}`);

  ensureEnvLocalTemplate();
  checkGitignore(outputPath);
}

/**
 * Write .env.local template if it doesn't exist yet.
 */
function ensureEnvLocalTemplate(): void {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) return;

  const template = [
    '# supatool credentials — never commit this file',
    '# Option A: Supabase URL + service role key (recommended)',
    'SUPABASE_URL=https://your-project-ref.supabase.co',
    'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key',
    '',
    '# Option B: direct connection string',
    '# SUPABASE_CONNECTION_STRING=postgresql://user:password@host:port/database',
  ].join('\n') + '\n';

  fs.writeFileSync(envLocalPath, template, 'utf-8');
  console.log('.env.local template created — fill in your credentials.');
}

/**
 * Warn if the config file or .env.local are not covered by .gitignore.
 */
function checkGitignore(configPath: string): void {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    console.warn('Warning: .gitignore not found. Make sure to exclude .env.local and supatool.config.json.');
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim());
  const missing: string[] = [];

  const configFile = path.basename(configPath);
  if (!lines.some(l => l === configFile || l === `/${configFile}`)) {
    missing.push(configFile);
  }
  if (!lines.some(l => l === '.env.local' || l === '*.local')) {
    missing.push('.env.local');
  }

  if (missing.length > 0) {
    console.warn(`\nWarning: The following are NOT in .gitignore — add them to avoid committing secrets:`);
    for (const f of missing) {
      console.warn(`  ${f}`);
    }
    // Auto-append to .gitignore
    const toAdd = missing.map(f => f).join('\n') + '\n';
    fs.appendFileSync(gitignorePath, '\n# supatool\n' + toAdd);
    console.log(`Auto-added to .gitignore: ${missing.join(', ')}`);
  } else {
    console.log('.gitignore OK — credentials files are excluded.');
  }
} 