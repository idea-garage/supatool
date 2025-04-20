#!/usr/bin/env node

// CLI entry point
// Subcommand support with commander
import { Command } from 'commander';
import { main } from '../index';
import { helpText } from './helptext.js'; // Import help text from external file
import { version } from '../../package.json';

const program = new Command();

program
  .name('supatool')
  .description('Supatool CLI')
  .version(version);

// crud subcommand
program
  .command('crud')
  .description('Generate CRUD types')
  .option('-i, --import <path>', 'Import path for type definitions', 'shared/')
  .option('-e, --export <path>', 'Output path for CRUD code', 'src/integrations/supabase/')
  .option('-t, --tables <tables>', 'Generate only for specific tables (comma separated)')
  .option('-f, --force', 'Force overwrite output folder without confirmation')
  .action((options) => {
    // Reflect command line arguments to process.argv (for main() reuse)
    const args = process.argv.slice(0, 2);
    if (options.import) {
      args.push('-i', options.import);
    }
    if (options.export) {
      args.push('-e', options.export);
    }
    if (options.force) {
      args.push('--force');
    }
    process.argv = args;
    main();
  });

// help subcommand
program
  .command('help')
  .description('Show help')
  .action(() => {
    console.log(helpText);
  });

// If no subcommand is specified, show helpText only (do not call main)
if (!process.argv.slice(2).length) {
  console.log(helpText);
  process.exit(0);
}

program.parse(process.argv);