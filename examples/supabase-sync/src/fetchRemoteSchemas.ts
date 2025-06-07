import pgStructure from 'pg-structure';

export async function fetchRemoteSchemas(connectionString: string): Promise<Record<string, { timestamp: Date, ddl: string }>> {
  const db = await pgStructure(connectionString, { includeSchemas: ['public'] });

  const result: Record<string, { timestamp: Date, ddl: string }> = {};

  for (const table of db.tables.values()) {
    const ddl = table.createSQL + ';
';
    const updatedAt = new Date();

    result[table.name] = {
      timestamp: updatedAt,
      ddl
    };
  }

  return result;
}