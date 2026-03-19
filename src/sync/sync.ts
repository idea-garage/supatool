import * as path from 'path';
import { parseLocalSchemas } from './parseLocalSchemas';
import { fetchRemoteSchemas } from './fetchRemoteSchemas';
import { writeSchemaToFile, backupOrphanedFiles, resetApprovalState } from './writeSchema';
import { generateMigrationFile } from './generateMigration';
import { diffLines, diffWords } from 'diff';
import { wildcardMatch, askUserConfirmation } from './utils';

// Global approval state (shared with writeSchema.ts)
let globalApproveAll = false;

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

export interface SyncOptions {
  connectionString: string;
  schemaDir: string;
  tablePattern?: string;
  force?: boolean;
  dryRun?: boolean;
  generateOnly?: boolean;
  requireConfirmation?: boolean;
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
  requireConfirmation = false
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
            process.cwd()
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
} 