import { parseLocalSchemas } from './parseLocalSchemas';
import { fetchRemoteSchemas } from './fetchRemoteSchemas';
import { writeSchemaToFile } from './writeSchema';
import { diffLines } from 'diff';
import { wildcardMatch } from './utils';

export async function syncAllTables({
  connectionString,
  schemaDir,
  tablePattern = '*'
}: {
  connectionString: string;
  schemaDir: string;
  tablePattern?: string;
}) {
  const localSchemas = await parseLocalSchemas(schemaDir);
  const remoteSchemas = await fetchRemoteSchemas(connectionString);

  const allTables = new Set([...Object.keys(localSchemas), ...Object.keys(remoteSchemas)]);

  for (const tableName of allTables) {
    if (!wildcardMatch(tableName, tablePattern)) {
      continue;
    }

    const local = localSchemas[tableName];
    const remote = remoteSchemas[tableName];

    if (local && !remote) {
      console.log(`[${tableName}] Local only - consider dropping or exporting`);
    } else if (!local && remote) {
      console.log(`[${tableName}] Remote only - pulling schema`);
      await writeSchemaToFile(remote.ddl, schemaDir, remote.timestamp, `${tableName}.sql`, tableName);
    } else if (local && remote) {
      if (remote.timestamp > local.timestamp) {
        console.log(`[${tableName}] Remote is newer - updating local`);
        await writeSchemaToFile(remote.ddl, schemaDir, remote.timestamp, `${tableName}.sql`, tableName);
      } else if (local.timestamp > remote.timestamp) {
        console.log(`[${tableName}] Local is newer - manual migration needed`);
      } else {
        const diff = diffLines(local.ddl, remote.ddl);
        const hasDiff = diff.some(part => part.added || part.removed);
        if (hasDiff) {
          console.log(`[${tableName}] DDL diff detected - updating local`);
          await writeSchemaToFile(remote.ddl, schemaDir, remote.timestamp, `${tableName}.sql`, tableName);
        } else {
          console.log(`[${tableName}] Up to date`);
        }
      }
    }
  }
}