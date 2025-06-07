import fs from 'fs/promises';
import path from 'path';

export async function writeSchemaToFile(schemaSQL: string, outDir: string, timestamp: Date, filename: string, tableName: string) {
  const outPath = path.join(outDir, filename);
  await fs.mkdir(outDir, { recursive: true });

  const header = `-- schema-synced-at: ${timestamp.toISOString()}
-- table-name: ${tableName}

`;

  await fs.writeFile(outPath, header + schemaSQL, 'utf8');
  console.log(`Schema written to ${outPath}`);
}