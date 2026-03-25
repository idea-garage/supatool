import * as path from 'path';
import { parseLocalSchemas } from './parseLocalSchemas';
import { fetchRemoteSchemas } from './fetchRemoteSchemas';
import { writeSchemaToFile, backupOrphanedFiles, resetApprovalState } from './writeSchema';
import * as fs from 'fs';
import { generateMigrationFile, generateFunctionMigrationFile, generateRenameTableMigrationFile, generateRlsMigrationFile } from './generateMigration';
import type { RlsPolicy } from './generateMigration';
import type { MigrationConfig } from './config';
import { diffLines, diffWords } from 'diff';
import { wildcardMatch, askUserConfirmation } from './utils';

// Global approval state (shared with writeSchema.ts)
let globalApproveAll = false;

/**
 * Extract column names from a CREATE TABLE DDL string.
 */
function extractColumnNames(ddl: string): string[] {
  const match = ddl.match(/CREATE TABLE[^(]*\(([\s\S]*)\)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(line => line.trim())
    .filter(line => !line.match(/^(PRIMARY|CONSTRAINT|UNIQUE|FOREIGN|CHECK)/i))
    .map(line => { const m = line.match(/^([a-zA-Z_]\w*)/); return m ? m[1] : ''; })
    .filter(Boolean);
}

/**
 * Normalize DDL string (unify spaces, newlines, tabs)
 */
function normalizeDDL(ddl: string): string {
  return ddl
    .replace(/\s+/g, ' ')     // Replace consecutive whitespace with single space
    .replace(/;\s+/g, ';\n')  // Add newline after semicolon
    .trim();                  // Remove leading/trailing whitespace
}

/**
 * Format SQL for readability
 */
function formatSQL(sql: string): string {
  return sql
    .replace(/,\s*/g, ',\n  ')                    // Add newline and indent after comma
    .replace(/\(\s*/g, ' (\n  ')                  // Add newline and indent after opening parenthesis
    .replace(/\s*\)/g, '\n)')                     // Add newline before closing parenthesis
    .replace(/\bCREATE\s+TABLE\b/g, '\nCREATE TABLE')  // Add newline before CREATE TABLE
    .replace(/\bPRIMARY\s+KEY\b/g, '\n  PRIMARY KEY')   // Add newline and indent before PRIMARY KEY
    .replace(/;\s*/g, ';\n')                      // Add newline after semicolon
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n');
}

export type RlsMode = 'skip' | 'rewrite';

export interface SyncOptions {
  connectionString: string;
  schemaDir: string;
  tablePattern?: string;
  force?: boolean;
  dryRun?: boolean;
  generateOnly?: boolean;
  requireConfirmation?: boolean;
  migrationConfig?: MigrationConfig;
  rlsMode?: RlsMode;
}

/**
 * Synchronize all table schemas
 */
export async function syncAllTables({
  connectionString,
  schemaDir,
  tablePattern = '*',
  force = false,
  dryRun = false,
  generateOnly = false,
  requireConfirmation = false,
  migrationConfig,
  rlsMode = 'skip'
}: SyncOptions): Promise<void> {
  // Reset approval state
  resetApprovalState();
  
  const localSchemas = await parseLocalSchemas(schemaDir);
  
  // Filter local tables based on pattern first
  const targetLocalTables = Object.keys(localSchemas).filter(tableName => 
    wildcardMatch(tableName, tablePattern)
  );

  console.log(`Pattern: ${tablePattern}`);
  console.log(`Schema directory: ${schemaDir}`);
  console.log(`Available local tables: ${Object.keys(localSchemas).join(', ') || 'none'}`);
  console.log(`Matched local tables: ${targetLocalTables.join(', ') || 'none'}`);

  if (targetLocalTables.length === 0) {
    console.log('No matching local tables found for the specified pattern.');
    return;
  }

  // Fetch only the remote schemas for target tables
  const remoteSchemas = await fetchRemoteSchemas(connectionString, targetLocalTables);

  // --- Table rename detection ---
  // Tables that exist locally but not remotely (potential new name)
  const localOnly = targetLocalTables.filter(t => !remoteSchemas[t]);
  // Tables that exist remotely but not locally (potential old name)
  const remoteOnly = Object.keys(remoteSchemas).filter(t => !localSchemas[t]);

  for (const newName of localOnly) {
    const localDdl = localSchemas[newName]?.ddl ?? '';
    const localCols = extractColumnNames(localDdl);
    if (localCols.length === 0) continue;

    for (const oldName of remoteOnly) {
      const remoteDdl = remoteSchemas[oldName]?.ddl ?? '';
      const remoteCols = extractColumnNames(remoteDdl);
      if (remoteCols.length === 0) continue;

      const shared = localCols.filter(c => remoteCols.includes(c)).length;
      const similarity = shared / Math.max(localCols.length, remoteCols.length);

      if (similarity >= 0.7) {
        console.warn(
          `⚠️  Possible table rename detected: "${oldName}" → "${newName}" ` +
          `(${Math.round(similarity * 100)}% column match). ` +
          `Generating rename migration — review before applying.`
        );
        // Infer schema from CREATE TABLE <schema>.<table> in DDL (default public)
        const schemaMatch = localDdl.match(/CREATE TABLE\s+(\w+)\.\w+/i);
        const schema = schemaMatch ? schemaMatch[1] : 'public';
        await generateRenameTableMigrationFile(schema, oldName, newName, process.cwd(), migrationConfig);
      }
    }
  }

  for (const tableName of targetLocalTables) {
    const local = localSchemas[tableName];
    const remote = remoteSchemas[tableName];

    // Always use local as the source (never overwrite local files)
    if (local && !remote) {
      // Local only: generate CREATE TABLE migration
      console.log(`[${tableName}] Local only - will generate CREATE TABLE migration`);
      
      if (dryRun) {
        console.log(`[${tableName}] 🔍 CREATE TABLE migration will be generated`);
        console.log(`[${tableName}] 📄 Migration file: supabase/migrations/YYYYMMDDHHMMSS_create_${tableName}.sql`);
      } else if (generateOnly) {
        console.log(`[${tableName}] 📝 generateOnly mode: skipping migration generation for local-only table`);
      } else {
        // Generate CREATE TABLE migration
        // For now, skip actual migration generation for local-only tables
        console.log(`[${tableName}] CREATE TABLE migration generation not yet implemented`);
      }
    } else if (local && remote) {
      // Both local and remote exist: generate UPDATE migration (local → remote)
      const normalizedLocal = local.normalizedDdl;
      const normalizedRemote = normalizeDDL(remote.ddl);
      const diff = diffLines(normalizedLocal, normalizedRemote);
      const hasDiff = diff.some(part => part.added || part.removed);
      
      if (hasDiff) {
        console.log(`[${tableName}] Differences detected - will generate UPDATE migration`);
        
        // Show formatted diff (local → remote)
        const formattedLocal = formatSQL(normalizedLocal);
        const formattedRemote = formatSQL(normalizedRemote);
        const lineDiff = diffLines(formattedRemote, formattedLocal);
        
        // Display diff for confirmation
        const contextLines = 1;
        let outputLines: string[] = [];
        
        lineDiff.forEach((part, index) => {
          const lines = part.value.split('\n').filter(line => line.trim() || index === lineDiff.length - 1);
          
          if (part.added) {
            lines.forEach(line => {
              if (line.trim()) {
                outputLines.push(`\x1b[32m+ ${line}\x1b[0m`);
              }
            });
          } else if (part.removed) {
            lines.forEach(line => {
              if (line.trim()) {
                outputLines.push(`\x1b[31m- ${line}\x1b[0m`);
              }
            });
          }
        });
        
        if (outputLines.length > 0) {
          console.log(`[${tableName}] Changes to apply:`);
          outputLines.forEach(line => console.log(line));
        }
        
        // Generate or preview migration
        if (dryRun) {
          console.log(`[${tableName}] 🔍 UPDATE migration will be generated`);
          console.log(`[${tableName}] 📄 File to be generated: supabase/migrations/YYYYMMDDHHMMSS_update_${tableName}.sql`);
        } else if (generateOnly) {
          console.log(`[${tableName}] 📝 generateOnly mode: skipping migration generation`);
        } else {
          // Confirmation check for confirmation mode
          if (requireConfirmation && !force) {
            const confirmed = await askUserConfirmation(`Generate UPDATE migration for table ${tableName}?`);
            if (!confirmed) {
              console.log(`[${tableName}] Skipped by user confirmation`);
              continue;
            }
          }
          
          // Generate migration file (local → remote diff)
          const migrationPath = await generateMigrationFile(
            tableName,
            normalizedRemote,  // from (current remote state)
            normalizedLocal,   // to (local target state)
            process.cwd(),
            migrationConfig
          );
          if (migrationPath) {
            console.log(`[${tableName}] 📝 UPDATE migration generated: ${migrationPath}`);
          }
        }
      } else {
        console.log(`[${tableName}] No differences found`);
      }
    }
  }

  // --- Function diff: scan local rpc/*.sql vs remote ---
  await syncFunctions(connectionString, schemaDir, migrationConfig);

  // --- RLS diff ---
  if (rlsMode === 'rewrite') {
    await syncRls(connectionString, schemaDir, migrationConfig);
  }
}

/**
 * Scan local <schemaDir>/<schema>/rpc/*.sql, compare with remote pg_get_functiondef,
 * and generate CREATE OR REPLACE migrations for any changed functions.
 */
async function syncFunctions(
  connectionString: string,
  schemaDir: string,
  migrationConfig?: MigrationConfig
): Promise<void> {
  const { Client } = await import('pg');

  // Collect all local rpc sql files: { schema, funcName, localDdl }
  const entries: { schema: string; funcName: string; localDdl: string }[] = [];

  if (!fs.existsSync(schemaDir)) return;

  for (const schemaEntry of fs.readdirSync(schemaDir, { withFileTypes: true })) {
    if (!schemaEntry.isDirectory()) continue;
    const rpcDir = path.join(schemaDir, schemaEntry.name, 'rpc');
    if (!fs.existsSync(rpcDir)) continue;
    for (const file of fs.readdirSync(rpcDir)) {
      if (!file.endsWith('.sql')) continue;
      const funcName = file.replace(/\.sql$/, '');
      const localDdl = fs.readFileSync(path.join(rpcDir, file), 'utf-8');
      entries.push({ schema: schemaEntry.name, funcName, localDdl });
    }
  }

  if (entries.length === 0) return;

  const client = new Client({ connectionString });
  await client.connect();

  let changed = 0;
  try {
    for (const { schema, funcName, localDdl } of entries) {
      const result = await client.query(
        `SELECT pg_get_functiondef(p.oid) as definition
         FROM pg_proc p
         JOIN pg_namespace n ON p.pronamespace = n.oid
         WHERE n.nspname = $1 AND p.proname = $2
         LIMIT 1`,
        [schema, funcName]
      );

      if (result.rows.length === 0) {
        // Function not in remote yet — generate migration to create it
        const migrationPath = await generateFunctionMigrationFile(
          schema, funcName, localDdl, '', process.cwd(), migrationConfig
        );
        if (migrationPath) {
          console.log(`[${schema}.${funcName}] 📝 NEW function migration generated: ${migrationPath}`);
          changed++;
        }
        continue;
      }

      const remoteDdl = result.rows[0].definition as string;
      const migrationPath = await generateFunctionMigrationFile(
        schema, funcName, localDdl, remoteDdl, process.cwd(), migrationConfig
      );
      if (migrationPath) {
        console.log(`[${schema}.${funcName}] 📝 UPDATE function migration generated: ${migrationPath}`);
        changed++;
      }
    }
  } finally {
    await client.end();
  }

  if (changed === 0) {
    console.log('Functions: no differences found');
  } else {
    console.log(`Functions: ${changed} migration(s) generated`);
  }
}

/**
 * Fetch remote RLS policies, compare with local <schemaDir>/<schema>/rls/*.sql,
 * and generate DROP + CREATE migrations for changed/new/deleted policies.
 */
async function syncRls(
  connectionString: string,
  schemaDir: string,
  migrationConfig?: MigrationConfig
): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Fetch all policies from remote
    const result = await client.query<{
      schemaname: string;
      tablename: string;
      policyname: string;
      cmd: string;
      roles: string;
      qual: string | null;
      with_check: string | null;
      permissive: string;
    }>(`
      SELECT schemaname, tablename, policyname, cmd,
             array_to_string(roles, ',') as roles,
             qual, with_check,
             permissive
      FROM pg_policies
      ORDER BY schemaname, tablename, policyname
    `);

    // Build remote policy map: key = "schema.table.policyname"
    const remoteMap = new Map<string, RlsPolicy>();
    for (const row of result.rows) {
      const tableQualified = row.schemaname === 'public'
        ? row.tablename
        : `${row.schemaname}.${row.tablename}`;
      const key = `${row.schemaname}.${row.tablename}.${row.policyname}`;
      remoteMap.set(key, {
        policyName: row.policyname,
        tableName: tableQualified,
        cmd: row.cmd ?? 'ALL',
        roles: row.roles ?? 'public',
        qual: row.qual ?? null,
        withCheck: row.with_check ?? null,
        permissive: row.permissive !== 'RESTRICTIVE'
      });
    }

    // Build local policy map from rls/*.sql files
    const localMap = new Map<string, string>(); // key → raw SQL
    if (fs.existsSync(schemaDir)) {
      for (const schemaEntry of fs.readdirSync(schemaDir, { withFileTypes: true })) {
        if (!schemaEntry.isDirectory()) continue;
        const rlsDir = path.join(schemaDir, schemaEntry.name, 'rls');
        if (!fs.existsSync(rlsDir)) continue;
        for (const file of fs.readdirSync(rlsDir)) {
          if (!file.endsWith('.sql')) continue;
          // filename: tablename__policyname.sql
          const baseName = file.replace(/\.sql$/, '');
          const key = `${schemaEntry.name}.${baseName.replace('__', '.')}`;
          localMap.set(key, fs.readFileSync(path.join(rlsDir, file), 'utf-8'));
        }
      }
    }

    // Detect changes: remote policies not matching local
    const changed: RlsPolicy[] = [];
    const dropped: { policyName: string; tableName: string }[] = [];

    // Policies in remote that differ from local (or absent in local → drop)
    for (const [key, remotePolicy] of remoteMap) {
      if (!localMap.has(key)) {
        // Remote has policy but local doesn't — local wins: drop it
        dropped.push({ policyName: remotePolicy.policyName, tableName: remotePolicy.tableName });
      }
      // If local has it, we trust local as SSoT — will re-create from local below
    }

    // Policies in local but not in remote, or that differ → re-create
    for (const [key, localSql] of localMap) {
      const remotePolicy = remoteMap.get(key);
      const normalizedLocal = localSql.replace(/\s+/g, ' ').trim();
      if (!remotePolicy) {
        // New policy in local
        changed.push(parsePolicySql(localSql, key));
      } else {
        // Compare: rebuild remote SQL and compare normalized
        const remoteSql = buildPolicySql(remotePolicy);
        if (normalizedLocal !== remoteSql.replace(/\s+/g, ' ').trim()) {
          changed.push(parsePolicySql(localSql, key));
        }
      }
    }

    const migrationPath = await generateRlsMigrationFile(changed, dropped, process.cwd(), migrationConfig);
    if (!migrationPath) {
      console.log('RLS: no differences found');
    } else {
      console.log(`RLS: ${changed.length} changed, ${dropped.length} dropped`);
    }
  } finally {
    await client.end();
  }
}

function buildPolicySql(p: RlsPolicy): string {
  const permissive = p.permissive ? 'PERMISSIVE' : 'RESTRICTIVE';
  let sql = `CREATE POLICY "${p.policyName}" ON ${p.tableName} AS ${permissive} FOR ${p.cmd} TO ${p.roles}`;
  if (p.qual) sql += ` USING (${p.qual})`;
  if (p.withCheck) sql += ` WITH CHECK (${p.withCheck})`;
  return sql + ';';
}

function parsePolicySql(sql: string, key: string): RlsPolicy {
  // Best-effort parse of CREATE POLICY DDL to RlsPolicy struct
  const tableMatch = sql.match(/ON\s+(\S+)/i);
  const policyMatch = sql.match(/CREATE POLICY\s+"?([^"\s]+)"?/i);
  const cmdMatch = sql.match(/FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/i);
  const rolesMatch = sql.match(/TO\s+([^\n]+?)(?:\s+USING|\s+WITH CHECK|;|$)/i);
  const usingMatch = sql.match(/USING\s*\(([^)]+)\)/i);
  const withCheckMatch = sql.match(/WITH CHECK\s*\(([^)]+)\)/i);
  const permissive = !/RESTRICTIVE/i.test(sql);
  const parts = key.split('.');
  const policyName = policyMatch?.[1] ?? parts[parts.length - 1];
  const tableName = tableMatch?.[1] ?? `${parts[0]}.${parts[1]}`;
  return {
    policyName,
    tableName,
    cmd: cmdMatch?.[1] ?? 'ALL',
    roles: rolesMatch?.[1]?.trim() ?? 'public',
    qual: usingMatch?.[1] ?? null,
    withCheck: withCheckMatch?.[1] ?? null,
    permissive
  };
}