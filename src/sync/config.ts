import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// プロジェクト内の.env/.env.localファイルを読み込み
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

// .env.local が優先される
if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

export interface SyncConfig {
  connectionString?: string;
  schemaDir: string;
  tablePattern: string;
}

/**
 * 設定ファイルから設定を読み込み
 */
export function loadConfig(configPath?: string): Partial<SyncConfig> {
  const defaultConfigPath = path.join(process.cwd(), 'supatool.config.json');
  const finalConfigPath = configPath || defaultConfigPath;
  
  if (fs.existsSync(finalConfigPath)) {
    try {
      const configData = fs.readFileSync(finalConfigPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      console.warn(`設定ファイル読み込みエラー: ${finalConfigPath}`);
      return {};
    }
  }
  
  return {};
}

/**
 * 環境変数と設定ファイルから最終設定を取得
 */
export function resolveConfig(options: Partial<SyncConfig>, configPath?: string): SyncConfig {
  const fileConfig = loadConfig(configPath);
  
  return {
    connectionString: 
      options.connectionString || 
      process.env.SUPABASE_CONNECTION_STRING || 
      process.env.DATABASE_URL ||
      fileConfig.connectionString,
    schemaDir: options.schemaDir || fileConfig.schemaDir || './supabase/schemas',
    tablePattern: options.tablePattern || fileConfig.tablePattern || '*'
  };
}

/**
 * 設定ファイル雛形を生成
 */
export function createConfigTemplate(outputPath: string): void {
  const template = {
    connectionString: "postgresql://user:password@host:port/database",
    schemaDir: "./supabase/schemas",
    tablePattern: "*",
    "_comment": "接続文字列は .env または .env.local ファイルでSUPABASE_CONNECTION_STRINGまたはDATABASE_URLで設定することを推奨"
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(template, null, 2), 'utf-8');
  console.log(`設定ファイル雛形を生成: ${outputPath}`);
  console.log('⚠️  設定ファイルを.gitignoreに追加することを忘れずに！');
  console.log('💡 接続文字列は .env または .env.local ファイルで管理してください');
} 