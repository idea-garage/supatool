#!/usr/bin/env node

const minimist = require('minimist');
const { syncAllTables } = require('../dist');

(async () => {
  const argv = minimist(process.argv.slice(2));
  const connectionString = argv.connection;
  const schemaDir = argv.schemaDir;
  const tablePattern = argv.table || '*';

  if (!connectionString || !schemaDir) {
    console.error('Usage: supabase-schema-sync --connection <conn_string> --schemaDir <dir> [--table <pattern>]');
    process.exit(1);
  }

  await syncAllTables({
    connectionString,
    schemaDir,
    tablePattern
  });
})();