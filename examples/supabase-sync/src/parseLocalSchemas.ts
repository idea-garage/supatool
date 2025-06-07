import fs from 'fs/promises';
import path from 'path';

export async function parseLocalSchemas(schemaDir: string): Promise<Record<string, { timestamp: Date, ddl: string }>> {
  const files = await fs.readdir(schemaDir);
  const result: Record<string, { timestamp: Date, ddl: string }> = {};

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    const content = await fs.readFile(path.join(schemaDir, file), 'utf8');
    const timestampMatch = content.match(/-- schema-synced-at:\s*(.*)/);
    const tableNameMatch = content.match(/-- table-name:\s*(.*)/);

    if (!tableNameMatch) continue;

    const tableName = tableNameMatch[1].trim();
    const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date(0);

    result[tableName] = {
      timestamp,
      ddl: content
    };
  }

  return result;
}