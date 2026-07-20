#!/usr/bin/env node

const assert = require('assert');
const {
  generateCreateTableDDL,
  resolveMaxConcurrent,
  resolveConnectionTimeoutMs,
  resolveQueryTimeoutMs
} = require('../dist/sync/definitionExtractor');

function result(rows = []) {
  return { rows };
}

function createClient() {
  return {
    async query(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();

      if (normalizedSql.includes('FROM information_schema.columns c') && normalizedSql.includes('pg_catalog.format_type')) {
        return result([
          {
            column_name: 'id',
            data_type: 'integer',
            udt_name: 'int4',
            character_maximum_length: null,
            is_nullable: 'NO',
            column_default: null,
            is_generated: 'NEVER',
            generation_expression: null,
            full_type: 'integer'
          },
          {
            column_name: 'crossload_code',
            data_type: 'text',
            udt_name: 'text',
            character_maximum_length: null,
            is_nullable: 'YES',
            column_default: null,
            is_generated: 'NEVER',
            generation_expression: null,
            full_type: 'text'
          }
        ]);
      }

      if (normalizedSql.includes("con.contype = 'p'")) {
        assert.deepStrictEqual(params, ['schema_a', 'jobs']);
        assert.match(normalizedSql, /FROM pg_constraint con/);
        assert.match(normalizedSql, /nsp\.nspname = \$1/);
        assert.match(normalizedSql, /rel\.relname = \$2/);
        assert.match(normalizedSql, /WITH ORDINALITY/);
        return result([{ column_name: 'id' }]);
      }

      if (normalizedSql.includes("con.contype = 'u'")) {
        assert.deepStrictEqual(params, ['schema_a', 'jobs']);
        assert.match(normalizedSql, /FROM pg_constraint con/);
        assert.match(normalizedSql, /nsp\.nspname = \$1/);
        assert.match(normalizedSql, /rel\.relname = \$2/);
        assert.match(normalizedSql, /GROUP BY con\.oid, con\.conname/);
        return result([{ constraint_name: 'jobs_code_key', columns: 'crossload_code' }]);
      }

      if (normalizedSql.includes('obj_description(c.oid)')) return result([]);
      if (normalizedSql.includes('pgd.description as column_comment')) return result([]);
      if (normalizedSql.includes("WHERE c.contype = 'f'")) return result([]);
      if (normalizedSql.includes("AND con.contype = 'c'")) return result([]);

      throw new Error(`Unexpected query: ${normalizedSql}`);
    }
  };
}

async function main() {
  assert.strictEqual(resolveMaxConcurrent('1'), 1);
  assert.strictEqual(resolveMaxConcurrent('50'), 50);
  assert.strictEqual(resolveMaxConcurrent('100'), 50);
  assert.strictEqual(resolveMaxConcurrent('0'), 5);
  assert.strictEqual(resolveMaxConcurrent('-1'), 5);
  assert.strictEqual(resolveMaxConcurrent('not-a-number'), 5);
  assert.strictEqual(resolveConnectionTimeoutMs(undefined), 15000);
  assert.strictEqual(resolveConnectionTimeoutMs('999999'), 300000);
  assert.strictEqual(resolveQueryTimeoutMs(undefined), 60000);
  assert.strictEqual(resolveQueryTimeoutMs('1'), 1);

  const ddl = await generateCreateTableDDL(createClient(), 'jobs', 'schema_a');

  assert.match(ddl, /PRIMARY KEY \(id\)/);
  assert.doesNotMatch(ddl, /PRIMARY KEY \(id, id\)/);
  assert.match(ddl, /CONSTRAINT jobs_code_key UNIQUE \(crossload_code\)/);
  assert.doesNotMatch(ddl, /appdb_code/);

  console.log('✅ bounded extraction settings and schema-aware pg_catalog constraints');
}

main().catch(error => {
  console.error('❌ bounded extraction settings and schema-aware pg_catalog constraints');
  console.error(error);
  process.exit(1);
});
