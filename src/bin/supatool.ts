#!/usr/bin/env node

// CLI entry point
// Subcommand support with commander
import { Command } from 'commander';
import { main } from '../index';
import { helpText } from './helptext'; // Import help text from external file
import { version } from '../../package.json';
import { parseModelYaml } from '../parser/modelParser';
import { generateTableDocMarkdown, generateRelationsMarkdown } from '../generator/docGenerator';
import { generateTypesFromModel } from '../generator/typeGenerator';
import { generateCrudFromModel } from '../generator/crudGenerator';
import { generateSqlFromModel } from '../generator/sqlGenerator';
import { generateRlsSqlFromModel } from '../generator/rlsGenerator';
import { syncAllTables, resolveConfig, createConfigTemplate } from '../sync';
import { extractDefinitions } from '../sync/definitionExtractor';
import { generateSeedsFromRemote } from '../sync/seedGenerator';

import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('supatool')
  .description('Supatool CLI')
  .version(version);



// extract command
program
  .command('extract')
  .description('Extract and categorize database objects from Supabase')
  .option('-c, --connection <string>', 'Supabase connection string')
  .option('-o, --output-dir <path>', 'Output directory', './supabase/schemas')
  .option('-t, --tables <pattern>', 'Table pattern with wildcards', '*')
  .option('--tables-only', 'Extract only table definitions')
  .option('--views-only', 'Extract only view definitions')
  .option('--all', 'Extract all DB objects (tables, views, RLS, functions, triggers, cron, types)')
  .option('--no-separate', 'Output all objects in same directory')
  .option('--schema <schemas>', 'Target schemas, comma-separated (default: public)')
  .option('--config <path>', 'Configuration file path')
  .option('-f, --force', 'Force overwrite without confirmation')
  .action(async (options: any) => {
    const config = resolveConfig({
      connectionString: options.connection
    }, options.config);
    
    if (!config.connectionString) {
      console.error('Connection string is required. Set it using one of:');
      console.error('1. --connection option');
      console.error('2. SUPABASE_CONNECTION_STRING environment variable');
      console.error('3. DATABASE_URL environment variable');
      console.error('4. supatool.config.json configuration file');
      process.exit(1);
    }
    
    try {
      // Handle --schema option
      let schemas = ['public']; // default
      if (options.schema) {
        schemas = options.schema.split(',').map((s: string) => s.trim());
      }

      await extractDefinitions({
        connectionString: config.connectionString,
        outputDir: options.outputDir,
        separateDirectories: options.separate !== false,
        tablesOnly: options.tablesOnly,
        viewsOnly: options.viewsOnly,
        all: options.all,
        tablePattern: options.tables,
        force: options.force,
        schemas: schemas,
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

// gen:crud subcommand
program
  .command('gen:crud <modelPath>')
  .description('Generate CRUD TypeScript code from model YAML [deprecated - prefer writing code with LLM]')
  .option('-o, --out <dir>', 'Output directory', 'docs/generated/crud')
  .action((modelPath: string, options: any) => {
    console.warn('⚠️  gen:crud is deprecated. With LLM development, writing code as needed is often more efficient.');
    const model = parseModelYaml(modelPath);
    generateCrudFromModel(model, options.out);
          console.log('Generated CRUD TypeScript code:', options.out);
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
    // Write to temp files first
    const tmpSchema = 'docs/generated/.tmp_schema.sql';
    const tmpRls = 'docs/generated/.tmp_rls.sql';
    generateSqlFromModel(model, tmpSchema);
    generateRlsSqlFromModel(model, tmpRls);
    // Merge into single file
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

// gen:all subcommand
program
  .command('gen:all <modelPath>')
  .description('Generate all from model YAML')
  .action((modelPath) => {
    const model = parseModelYaml(modelPath);
    generateTypesFromModel(model, 'docs/generated/types.ts');
    generateCrudFromModel(model, 'docs/generated/crud');
    generateTableDocMarkdown(model, 'docs/generated/table-doc.md');
    generateRelationsMarkdown(model, 'docs/generated/relations.md');
    console.log('TypeScript types output: docs/generated/types.ts');
    console.log('CRUD code output: docs/generated/crud/');
    console.log('Table doc output: docs/generated/table-doc.md');
    console.log('Relations list output: docs/generated/relations.md');
  });

// create subcommand
program
  .command('create <template>')
  .description('Generate template YAML')
  .option('-o, --out <path>', 'Output path', 'docs/model-schema-example.yaml')
  .action((template: string, options: any) => {
    const srcPath = path.join(__dirname, '../templates/yaml', `${template}.yaml`);
    const destPath = options.out;
    if (!fs.existsSync(srcPath)) {
      console.error(`Template not found: ${srcPath}`);
      process.exit(1);
    }
    fs.copyFileSync(srcPath, destPath);
    console.log(`Template generated: ${destPath}`);
  });

// crud command (Supabase types -> CRUD generation)
program
  .command('crud')
  .description('Generate CRUD from Supabase type definitions [deprecated - prefer writing code with LLM]')
  .option('-i, --input <path>', 'Type definition input path', 'shared/')
  .option('-o, --output <path>', 'CRUD code output path', 'src/integrations/supabase/')
  .option('-t, --tables <names>', 'Target tables (comma-separated)')
  .option('-f, --force', 'Force overwrite output')
  .action((options: any) => {
    console.warn('⚠️  crud is deprecated. With LLM development, writing code as needed is often more efficient.');
    // Pass argv to main() for CLI args
    main();
  });

// help subcommand
program
  .command('help')
  .description('Show help')
  .action(() => {
    console.log(helpText);
  });

// sync command (deprecated)
program
  .command('sync')
  .description('Synchronize local and remote schemas [deprecated]')
  .option('-c, --connection <string>', 'Supabase connection string')
  .option('-s, --schema-dir <path>', 'Local schema directory', './supabase/schemas')
  .option('-t, --tables <pattern>', 'Table pattern (wildcards supported)', '*')
  .option('-f, --force', 'Force overwrite (no confirmation)')
  .option('--config <path>', 'Configuration file path')
  .action(async (options: any) => {
    console.warn('⚠️  WARNING: sync command is deprecated.');
    console.warn('   Please use `supatool deploy` command instead.');
    console.warn('   Example: supatool deploy --table users --dry-run');
    console.warn('   Example: supatool deploy --table all --dry-run  # all tables');
    console.warn('');
    
    const config = resolveConfig({
      connectionString: options.connection
    }, options.config);
    
    if (!config.connectionString) {
      console.error('Connection string is required. Set it using one of:');
      console.error('1. --connection option');
      console.error('2. SUPABASE_CONNECTION_STRING environment variable');
      console.error('3. DATABASE_URL environment variable');
      console.error('4. supatool.config.json configuration file');
      process.exit(1);
    }
    
    try {
      await syncAllTables({
        connectionString: config.connectionString,
        schemaDir: options.schemaDir,
        tablePattern: options.tables,
        force: options.force
      });
    } catch (error) {
      console.error('⚠️ Sync error:', error);
      process.exit(1);
    }
  });

// deploy command (recommended)
program
  .command('deploy')
  .description('Deploy local schema to remote (diff detection, migration generation, confirm before apply)')
  .option('-c, --connection <string>', 'Supabase connection string')
  .option('-s, --schema-dir <path>', 'Local schema directory', './supabase/schemas')
  .option('-t, --table <name>', 'Target table name (specify "all" for all tables)')
  .option('--auto-apply', 'Auto-apply to remote (no confirmation)')
  .option('--dry-run', 'Preview changes only (recommended)')
  .option('--generate-only', 'Generate migration files only (no apply)')
  .option('--config <path>', 'Configuration file path')
  .action(async (options: any) => {
    const config = resolveConfig({
      connectionString: options.connection
    }, options.config);
    
    if (!config.connectionString) {
      console.error('Connection string is required. Set it using one of:');
      console.error('1. --connection option');
      console.error('2. SUPABASE_CONNECTION_STRING environment variable');
      console.error('3. DATABASE_URL environment variable');
      console.error('4. supatool.config.json configuration file');
      process.exit(1);
    }
    
    // Validate table specification
    if (!options.table) {
      console.error('❌ Table name is required. Use --table <table-name>');
      console.error('   Example: supatool deploy --table users --dry-run');
      console.error('   Example: supatool deploy --table all --dry-run  # all tables');
      process.exit(1);
    }
    
    const tablePattern = options.table === 'all' ? '*' : options.table;
    
    // Option processing
    const isDryRun = options.dryRun || false;
    const isAutoApply = options.autoApply || false;
    const isGenerateOnly = options.generateOnly || false;
    
    // Conflict check
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
        connectionString: config.connectionString,
        schemaDir: options.schemaDir,
        tablePattern: tablePattern,
        force: isAutoApply,
        dryRun: isDryRun,
        generateOnly: isGenerateOnly,
        requireConfirmation: !isDryRun && !isAutoApply && !isGenerateOnly
      });
    } catch (error) {
      console.error('⚠️ Deploy error:', error);
      process.exit(1);
    }
  });

// seed command
program
  .command('seed')
  .description('Fetch table data from remote DB and generate AI seed JSON')
  .option('-c, --connection <string>', 'Supabase connection string')
  .option('-t, --tables <path>', 'Tables list YAML', 'tables.yaml')
  .option('-o, --out <dir>', 'Output directory', 'supabase/seeds')
  .option('--config <path>', 'Configuration file path')
  .action(async (options: any) => {
    // Resolve connection
    const config = resolveConfig({
      connectionString: options.connection
    }, options.config);
    if (!config.connectionString) {
      console.error('Connection string is required. Set it using one of:');
      console.error('1. --connection option');
      console.error('2. SUPABASE_CONNECTION_STRING environment variable');
      console.error('3. DATABASE_URL environment variable');
      console.error('4. supatool.config.json configuration file');
      process.exit(1);
    }
    try {
      await generateSeedsFromRemote({
        connectionString: config.connectionString,
        tablesYamlPath: options.tables,
        outputDir: options.out
      });
    } catch (error) {
      console.error('⚠️ Seed fetch error:', error);
      process.exit(1);
    }
  });

// If no subcommand is specified, show helpText only (do not call main)
if (!process.argv.slice(2).length) {
  console.log(helpText);
  process.exit(0);
}

program.parse(process.argv);