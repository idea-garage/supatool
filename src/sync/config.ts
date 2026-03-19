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

export interface SyncConfig {
  connectionString?: string;
  schemaDir: string;
  tablePattern: string;
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
 * Generate config file template
 */
export function createConfigTemplate(outputPath: string): void {
  const template = {
    connectionString: "postgresql://user:password@host:port/database",
    schemaDir: "./supabase/schemas",
    tablePattern: "*",
    "_comment": "It is recommended to set connection string in .env or .env.local file using SUPABASE_CONNECTION_STRING or DATABASE_URL"
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(template, null, 2), 'utf-8');
  console.log(`Configuration template generated: ${outputPath}`);
  console.log('⚠️  Remember to add the configuration file to .gitignore!');
  console.log('💡 Manage connection string in .env or .env.local file');
} 