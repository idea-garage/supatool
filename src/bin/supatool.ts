#!/usr/bin/env node

// CLI entry point
// Subcommand support with commander
import { Command } from 'commander';
import { helpText } from './helptext';
import { version } from '../../package.json';
import { parseModelYaml } from '../parser/modelParser';
import { generateTableDocMarkdown, generateRelationsMarkdown } from '../generator/docGenerator';
import { generateTypesFromModel } from '../generator/typeGenerator';
import { generateSqlFromModel } from '../generator/sqlGenerator';
import { generateRlsSqlFromModel } from '../generator/rlsGenerator';
import { syncAllTables, resolveConfig, createConfigTemplate } from '../sync';
import { extractDefinitions } from '../sync/definitionExtractor';
import { generateSeedsFromRemote } from '../sync/seedGenerator';
import { migrateRemote } from '../sync/migrateRemote';

import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('supatool')
  .description('Supatool CLI')
  .version(version);

function connectionRequiredError(): never {
  console.error('Connection string is required. Set it using one of:');
  console.error('1. --connection option');
  console.error('2. DB_CONNECTION_STRING environment variable');
  console.error('3. SUPABASE_CONNECTION_STRING environment variable (legacy)');
  console.error('4. DATABASE_URL environment variable (legacy)');
  console.error('5. supatool.config.json configuration file');
  process.exit(1);
}

// extract command
program
  .command('extract')
  .description('Extract and categorize database objects (tables, views, RLS, functions, triggers, types)')
  .option('-c, --connection <string>', 'Connection string (postgresql:// or postgres://)')
  .option('-o, --output-dir <path>', 'Output directory', './db/schemas')
  .option('-t, --tables <pattern>', 'Table pattern with wildcards', '*')
  .option('--tables-only', 'Extract only table definitions')
  .option('--views-only', 'Extract only view definitions')
  .option('--all', 'Extract all DB objects')
  .option('--no-separate', 'Output all objects in same directory')
  .option('--schema <schemas>', 'Target schemas, comma-separated (default: public)')
  .option('--all-schemas', 'Target all schemas in the DB (use with -e to exclude some)')
  .option('-e, --exclude-schema <schemas>', 'Schemas to exclude, comma-separated (use with --all-schemas)')
  .option('--config <path>', 'Configuration file path')
  .option('-f, --force', 'Force overwrite without confirmation')
  .action(async (options: any) => {
    const config = resolveConfig({
      connectionString: options.connection
    }, options.config);

    if (!config.connectionString) connectionRequiredError();

    try {
      let schemas = ['public'];
      if (options.schema) {
        schemas = options.schema.split(',').map((s: string) => s.trim());
      }
      const excludeSchemas: string[] = options.excludeSchema
        ? options.excludeSchema.split(',').map((s: string) => s.trim())
        : [];

      await extractDefinitions({
        connectionString: config.connectionString!,
        outputDir: options.outputDir,
        separateDirectories: options.separate !== false,
        tablesOnly: options.tablesOnly,
        viewsOnly: options.viewsOnly,
        all: options.all,
        tablePattern: options.tables,
        force: options.force,
        schemas: schemas,
        allSchemas: options.allSchemas || false,
        excludeSchemas,
        version
      });
    } catch (error) {
      console.error('⚠️ Extraction error:', error);
      process.exit(1);
    }
  });

// config:init subcommand
program
  .command('config:init')
  .description('Generate config file template')
  .option('-o, --out <path>', 'Output path', 'supatool.config.json')
  .action((options: any) => {
    createConfigTemplate(options.out);
  });

// gen:types subcommand
program
  .command('gen:types <modelPath>')
  .description('Generate TypeScript types from model YAML')
  .option('-o, --out <path>', 'Output path', 'docs/generated/types.ts')
  .action((modelPath: string, options: any) => {
    const model = parseModelYaml(modelPath);
    generateTypesFromModel(model, options.out);
    console.log('TypeScript types output:', options.out);
  });

// gen:docs subcommand
program
  .command('gen:docs <modelPath>')
  .description('Generate documentation (Markdown) from model YAML')
  .option('-o, --out <path>', 'Table doc output path', 'docs/generated/table-doc.md')
  .action((modelPath: string, options: any) => {
    const model = parseModelYaml(modelPath);
    generateTableDocMarkdown(model, options.out);
    generateRelationsMarkdown(model, 'docs/generated/relations.md');
    console.log('Table doc output:', options.out);
    console.log('Relations list output: docs/generated/relations.md');
  });

// gen:sql subcommand
program
  .command('gen:sql <modelPath>')
  .description('Generate table, relation, RLS/security SQL from model YAML')
  .option('-o, --out <path>', 'Output path', 'docs/generated/schema.sql')
  .action((modelPath: string, options: any) => {
    const model = parseModelYaml(modelPath);
    const tmpSchema = 'docs/generated/.tmp_schema.sql';
    const tmpRls = 'docs/generated/.tmp_rls.sql';
    generateSqlFromModel(model, tmpSchema);
    generateRlsSqlFromModel(model, tmpRls);
    const schema = fs.readFileSync(tmpSchema, 'utf-8');
    const rls = fs.readFileSync(tmpRls, 'utf-8');
    fs.writeFileSync(options.out, schema + '\n' + rls);
    fs.unlinkSync(tmpSchema);
    fs.unlinkSync(tmpRls);
    console.log('Table, relation, RLS/security SQL output:', options.out);
  });

// gen:rls subcommand
program
  .command('gen:rls <modelPath>')
  .description('Generate RLS/security policy SQL from model YAML')
  .option('-o, --out <path>', 'Output path', 'docs/generated/rls.sql')
  .action((modelPath: string, options: any) => {
    const model = parseModelYaml(modelPath);
    generateRlsSqlFromModel(model, options.out);
    console.log('RLS/security policy SQL output:', options.out);
  });

// deploy command
program
  .command('deploy')
  .description('Deploy local schema to remote (diff detection, migration generation, confirm before apply)')
  .option('-c, --connection <string>', 'Connection string (postgresql:// or postgres://)')
  .option('-s, --schema-dir <path>', 'Local schema directory', './db/schemas')
  .option('-t, --table <name>', 'Target table name (specify "all" for all tables)')
  .option('--auto-apply', 'Auto-apply to remote (no confirmation)')
  .option('--dry-run', 'Preview changes only (recommended)')
  .option('--generate-only', 'Generate migration files only (no apply)')
  .option('--rls <mode>', 'RLS migration mode: rewrite = DROP+CREATE policies (default: skip)', 'skip')
  .option('--config <path>', 'Configuration file path')
  .action(async (options: any) => {
    const config = resolveConfig({
      connectionString: options.connection
    }, options.config);

    if (!config.connectionString) connectionRequiredError();

    if (!options.table) {
      console.error('❌ Table name is required. Use --table <table-name>');
      console.error('   Example: supatool deploy --table users --dry-run');
      console.error('   Example: supatool deploy --table all --dry-run');
      process.exit(1);
    }

    const tablePattern = options.table === 'all' ? '*' : options.table;
    const isDryRun = options.dryRun || false;
    const isAutoApply = options.autoApply || false;
    const isGenerateOnly = options.generateOnly || false;

    const activeOptions = [isDryRun, isAutoApply, isGenerateOnly].filter(Boolean).length;
    if (activeOptions > 1) {
      console.error('❌ --dry-run, --auto-apply, --generate-only cannot be specified simultaneously');
      process.exit(1);
    }

    if (isDryRun) {
      console.log('🔍 Preview mode: showing changes');
    } else if (isAutoApply) {
      console.log('⚡ Auto-apply mode: executing without confirmation');
    } else if (isGenerateOnly) {
      console.log('📝 Migration generation mode: file generation only');
    } else {
      console.log('✅ Confirmation mode: generating migration then confirming before execution');
    }

    try {
      console.log(`Target tables: ${tablePattern}`);

      await syncAllTables({
        connectionString: config.connectionString!,
        schemaDir: options.schemaDir,
        tablePattern: tablePattern,
        force: isAutoApply,
        dryRun: isDryRun,
        generateOnly: isGenerateOnly,
        requireConfirmation: !isDryRun && !isAutoApply && !isGenerateOnly,
        migrationConfig: config.migration,
        rlsMode: options.rls
      });
    } catch (error) {
      console.error('⚠️ Deploy error:', error);
      process.exit(1);
    }
  });

// migrate command — apply pending SQL migration files to remote DB
program
  .command('migrate')
  .description('Apply pending migration files from db/migrations/ to remote DB')
  .option('-c, --connection <string>', 'Connection string (postgresql:// or postgres://)')
  .option('-d, --dir <path>', 'Migrations directory', 'db/migrations')
  .option('--dry-run', 'Preview pending migrations without applying')
  .option('--config <path>', 'Configuration file path')
  .action(async (options: any) => {
    const config = resolveConfig({
      connectionString: options.connection
    }, options.config);

    if (!config.connectionString) connectionRequiredError();

    try {
      await migrateRemote({
        connectionString: config.connectionString!,
        migrationsDir: options.dir,
        dryRun: options.dryRun || false
      });
    } catch (error) {
      console.error('⚠️ Migration error:', error);
      process.exit(1);
    }
  });

// seed command
program
  .command('seed')
  .description('Fetch table data from remote DB and generate seed JSON')
  .option('-c, --connection <string>', 'Connection string (postgresql:// or postgres://)')
  .option('-t, --tables <path>', 'Tables list YAML', 'tables.yaml')
  .option('-o, --out <dir>', 'Output directory', 'db/seeds')
  .option('--config <path>', 'Configuration file path')
  .action(async (options: any) => {
    const config = resolveConfig({
      connectionString: options.connection
    }, options.config);

    if (!config.connectionString) connectionRequiredError();

    try {
      await generateSeedsFromRemote({
        connectionString: config.connectionString!,
        tablesYamlPath: options.tables,
        outputDir: options.out
      });
    } catch (error) {
      console.error('⚠️ Seed fetch error:', error);
      process.exit(1);
    }
  });

// help subcommand
program
  .command('help')
  .description('Show help')
  .action(() => {
    console.log(helpText);
  });

// If no subcommand is specified, show helpText only
if (!process.argv.slice(2).length) {
  console.log(helpText);
  process.exit(0);
}

program.parse(process.argv);
