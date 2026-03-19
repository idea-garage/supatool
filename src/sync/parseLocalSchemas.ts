import * as fs from 'fs';
import * as path from 'path';

export interface LocalSchema {
  ddl: string;
  normalizedDdl: string; // normalized DDL for comparison
  timestamp: number;
  fileTimestamp: number; // file mtime
  filePath: string;
}

/**
 * Normalize DDL string (unify whitespace, newlines, tabs)
 */
function normalizeDDL(ddl: string): string {
  return ddl
    .replace(/\s+/g, ' ')     // collapse consecutive whitespace to single space
    .replace(/;\s+/g, ';\n')  // newline after semicolon
    .trim();                  // trim leading/trailing
}

/**
 * Parse schema from local SQL files
 */
export async function parseLocalSchemas(schemaDir: string): Promise<Record<string, LocalSchema>> {
  const schemas: Record<string, LocalSchema> = {};

  if (!fs.existsSync(schemaDir)) {
    return schemas;
  }

  const files = fs.readdirSync(schemaDir);
  console.log(`Reading schema directory: ${schemaDir}`);
  console.log(`Found SQL files: ${files.filter(f => f.endsWith('.sql')).join(', ') || 'none'}`);
  
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    
    const filePath = path.join(schemaDir, file);
    const stats = fs.statSync(filePath);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Get table name from filename (without .sql)
    const tableName = path.basename(file, '.sql');
    console.log(`Processing file: ${file} -> tableName: ${tableName}`);
    
    // Extract timestamp from comment in file; fallback to mtime
    let timestamp = Math.floor(stats.mtime.getTime() / 1000);
    const timestampMatch = fileContent.match(/-- Remote last updated: (.+)/);
    if (timestampMatch) {
      try {
        const dateStr = timestampMatch[1];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          timestamp = Math.floor(parsedDate.getTime() / 1000);
        }
      } catch (error) {
        // On error use file mtime
      }
    }
    
    // Extract DDL only (exclude comment and blank lines)
    const ddlLines = fileContent.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    });
    const rawDDL = ddlLines.join('\n').trim();
    
    // Normalize DDL
    const ddl = normalizeDDL(rawDDL);
    
    schemas[tableName] = {
      ddl: rawDDL,
      normalizedDdl: normalizeDDL(rawDDL),
      timestamp,
      fileTimestamp: Math.floor(stats.mtime.getTime() / 1000),
      filePath
    };
  }

  return schemas;
} 