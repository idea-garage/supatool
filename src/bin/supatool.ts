#!/usr/bin/env node

// CLIエントリポイント
// commanderでサブコマンド対応
import { Command } from 'commander';
import { main } from '../index';
import { helpText } from './helptext.js'; // ヘルプテキストを外部ファイルからimport

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
  .option('-t, --tables <tables>', 'カンマ区切りで特定テーブルのみ生成（複数可）')
  .option('-f, --force', '上書き確認なしで出力先を強制上書き')
  .action((options) => {
    // コマンドライン引数をprocess.argvに反映（既存main()流用のため）
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

// helpサブコマンド
program
  .command('help')
  .description('Show help')
  .action(() => {
    console.log(helpText);
  });

// サブコマンド未指定時はhelpTextのみ表示（mainは呼ばない）
if (!process.argv.slice(2).length) {
  console.log(helpText);
  process.exit(0);
}

program.parse(process.argv);