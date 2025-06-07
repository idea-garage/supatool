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

import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('supatool')
  .description('Supatool CLI')
  .version(version);

// sync サブコマンド
program
  .command('sync')
  .description('SupabaseのDBスキーマとローカルSQLファイルを同期')
  .option('-c, --connection <string>', 'Supabase接続文字列')
  .option('-d, --dir <path>', 'ローカルスキーマディレクトリ（デフォルト: ./supabase/schemas）')
  .option('-t, --tables <pattern>', 'テーブルパターン（ワイルドカード対応）')
  .option('--config <path>', '設定ファイルパス')
  .option('-f, --force', '確認なしで上書き')
  .action(async (options) => {
    const config = resolveConfig({
      connectionString: options.connection,
      schemaDir: options.dir,
      tablePattern: options.tables
    }, options.config);
    
    if (!config.connectionString) {
      console.error('接続文字列が必要です。以下のいずれかの方法で設定してください:');
      console.error('1. --connection オプション');
      console.error('2. 環境変数 SUPABASE_CONNECTION_STRING');
      console.error('3. 環境変数 DATABASE_URL'); 
      console.error('4. 設定ファイル supatool.config.json');
      console.error('\n設定ファイル雛形を作成: supatool config:init');
      process.exit(1);
    }
    
    try {
      await syncAllTables({
        connectionString: config.connectionString,
        schemaDir: config.schemaDir,
        tablePattern: config.tablePattern,
        force: options.force
      });
      console.log('✅ 同期が完了しました\n');
    } catch (error) {
      console.error('⚠️ 同期エラー:', error);
      process.exit(1);
    }
  });



// config:init サブコマンド
program
  .command('config:init')
  .description('設定ファイル雛形を生成')
  .option('-o, --out <path>', '出力先パス', 'supatool.config.json')
  .action((options) => {
    createConfigTemplate(options.out);
  });

// gen:types サブコマンド
program
  .command('gen:types <modelPath>')
  .description('モデルYAMLからTypeScript型定義を生成')
  .option('-o, --out <path>', '出力先パス', 'docs/generated/types.ts')
  .action((modelPath, options) => {
    const model = parseModelYaml(modelPath);
    generateTypesFromModel(model, options.out);
    console.log('TypeScript型定義を出力:', options.out);
  });

// gen:crud サブコマンド
program
  .command('gen:crud <modelPath>')
  .description('モデルYAMLからCRUD関数TypeScriptコードを生成')
  .option('-o, --out <dir>', '出力先ディレクトリ', 'docs/generated/crud')
  .action((modelPath, options) => {
    const model = parseModelYaml(modelPath);
    generateCrudFromModel(model, options.out);
    console.log('CRUD関数TypeScriptコードを出力:', options.out);
  });

// gen:docs サブコマンド
program
  .command('gen:docs <modelPath>')
  .description('モデルYAMLからドキュメント(Markdown)を生成')
  .option('-o, --out <path>', 'テーブル定義書出力先', 'docs/generated/table-doc.md')
  .action((modelPath, options) => {
    const model = parseModelYaml(modelPath);
    generateTableDocMarkdown(model, options.out);
    generateRelationsMarkdown(model, 'docs/generated/relations.md');
    console.log('テーブル定義書を出力:', options.out);
    console.log('リレーション一覧を出力: docs/generated/relations.md');
  });

// gen:sql サブコマンド
program
  .command('gen:sql <modelPath>')
  .description('モデルYAMLからテーブル・リレーション・RLS/セキュリティSQLを一括生成')
  .option('-o, --out <path>', '出力先パス', 'docs/generated/schema.sql')
  .action((modelPath, options) => {
    const model = parseModelYaml(modelPath);
    // 一時ファイルに個別出力
    const tmpSchema = 'docs/generated/.tmp_schema.sql';
    const tmpRls = 'docs/generated/.tmp_rls.sql';
    generateSqlFromModel(model, tmpSchema);
    generateRlsSqlFromModel(model, tmpRls);
    // 結合して1ファイルにまとめる
    const schema = fs.readFileSync(tmpSchema, 'utf-8');
    const rls = fs.readFileSync(tmpRls, 'utf-8');
    fs.writeFileSync(options.out, schema + '\n' + rls);
    fs.unlinkSync(tmpSchema);
    fs.unlinkSync(tmpRls);
    console.log('テーブル・リレーション・RLS/セキュリティSQLを一括出力:', options.out);
  });

// gen:rls サブコマンド
program
  .command('gen:rls <modelPath>')
  .description('モデルYAMLからRLS/セキュリティポリシーSQLを生成')
  .option('-o, --out <path>', '出力先パス', 'docs/generated/rls.sql')
  .action((modelPath, options) => {
    const model = parseModelYaml(modelPath);
    generateRlsSqlFromModel(model, options.out);
    console.log('RLS/セキュリティポリシーSQLを出力:', options.out);
  });

// gen:all サブコマンド
program
  .command('gen:all <modelPath>')
  .description('モデルYAMLから全て一括生成')
  .action((modelPath) => {
    const model = parseModelYaml(modelPath);
    generateTypesFromModel(model, 'docs/generated/types.ts');
    generateCrudFromModel(model, 'docs/generated/crud');
    generateTableDocMarkdown(model, 'docs/generated/table-doc.md');
    generateRelationsMarkdown(model, 'docs/generated/relations.md');
    console.log('TypeScript型定義を出力: docs/generated/types.ts');
    console.log('CRUD関数TypeScriptコードを出力: docs/generated/crud/');
    console.log('テーブル定義書を出力: docs/generated/table-doc.md');
    console.log('リレーション一覧を出力: docs/generated/relations.md');
  });

// create サブコマンド
program
  .command('create <template>')
  .description('テンプレートYAML雛形を生成')
  .option('-o, --out <path>', '出力先パス', 'docs/model-schema-example.yaml')
  .action((template, options) => {
    const srcPath = path.join(__dirname, '../templates/yaml', `${template}.yaml`);
    const destPath = options.out;
    if (!fs.existsSync(srcPath)) {
      console.error(`テンプレートが見つかりません: ${srcPath}`);
      process.exit(1);
    }
    fs.copyFileSync(srcPath, destPath);
    console.log(`テンプレート雛形を生成: ${destPath}`);
  });

// crud コマンド（Supabase型定義→CRUD生成）
program
  .command('crud')
  .description('Supabase型定義(TypeScript)からCRUD関数TypeScriptコードを生成')
  .option('-i, --input <path>', '型定義の入力パス', 'shared/')
  .option('-o, --output <path>', 'CRUDコード出力先', 'src/integrations/supabase/')
  .option('-t, --tables <names>', '生成対象テーブル（カンマ区切り）')
  .option('-f, --force', '出力先を強制上書き')
  .action((options) => {
    // コマンドライン引数をmain()に渡すため、process.argvをそのまま利用
    main();
  });

// helpサブコマンド
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