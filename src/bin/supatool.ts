#!/usr/bin/env node

// CLIエントリポイント
// commanderでサブコマンド対応
import { Command } from 'commander';
import { main } from '../index';
import { helpText } from './helptext'; // ヘルプテキストを外部ファイルからimport

const program = new Command();

program
  .name('supatool')
  .description('Supatool CLI')
  .version('0.1.0');

// crudサブコマンド
program
  .command('crud')
  .description('CRUD型生成')
  .option('-i, --import <path>', '型定義のimportパス', 'shared/')
  .option('-e, --export <path>', 'CRUD出力先パス', 'src/integrations/supabase/')
  .action((options) => {
    // コマンドライン引数をprocess.argvに反映（既存main()流用のため）
    const args = process.argv.slice(0, 2);
    if (options.import) {
      args.push('-i', options.import);
    }
    if (options.export) {
      args.push('-e', options.export);
    }
    process.argv = args;
    main();
  });

// helpサブコマンド
program
  .command('help')
  .description('ヘルプを表示')
  .action(() => {
    console.log(helpText);
  });

// crudサブコマンド未指定時はヘルプ表示
if (!process.argv.slice(2).length || !['crud', 'help', '-h', '--help', '-V', '--version'].some(cmd => process.argv.includes(cmd))) {
  console.log(helpText);
  process.exit(0);
}

program.parse(process.argv);