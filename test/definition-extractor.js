#!/usr/bin/env node

const assert = require('assert');
const {
  fetchTableDefinitions,
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

  const priorMaxConcurrent = process.env.SUPATOOL_MAX_CONCURRENT;
  let activeViewDefinitions = 0;
  let maxActiveViewDefinitions = 0;
  const serializedViewClient = {
    async query(sql) {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      if (normalizedSql.includes('FROM pg_tables')) return result([]);
      if (normalizedSql.includes('FROM pg_views') && normalizedSql.includes("'view' as type")) {
        return result([
          { tablename: 'first_view', schemaname: 'schema_a', type: 'view' },
          { tablename: 'second_view', schemaname: 'schema_a', type: 'view' }
        ]);
      }
      if (normalizedSql.includes('pv.definition')) {
        activeViewDefinitions += 1;
        maxActiveViewDefinitions = Math.max(maxActiveViewDefinitions, activeViewDefinitions);
        await new Promise(resolve => setImmediate(resolve));
        activeViewDefinitions -= 1;
        return result([{ definition: 'SELECT 1', relname: 'test_view', reloptions: null }]);
      }
      if (normalizedSql.includes('view_comment')) return result([]);
      if (normalizedSql.includes('pg_stat_get_last_vacuum_time')) return result([]);
      throw new Error(`Unexpected SQL: ${normalizedSql}`);
    }
  };
  try {
    process.env.SUPATOOL_MAX_CONCURRENT = '1';
    const views = await fetchTableDefinitions(serializedViewClient, undefined, undefined, ['schema_a']);
    assert.strictEqual(views.length, 2);
    assert.strictEqual(maxActiveViewDefinitions, 1);
  } finally {
    if (priorMaxConcurrent === undefined) delete process.env.SUPATOOL_MAX_CONCURRENT;
    else process.env.SUPATOOL_MAX_CONCURRENT = priorMaxConcurrent;
  }

  const timedOutViewClient = {
    async query(sql) {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      if (normalizedSql.includes('FROM pg_tables')) return result([]);
      if (normalizedSql.includes('FROM pg_views') && normalizedSql.includes("'view' as type")) {
        return result([{ tablename: 'slow_view', schemaname: 'schema_a', type: 'view' }]);
      }
      if (normalizedSql.includes('pv.definition')) throw new Error('Query read timeout');
      throw new Error(`Unexpected SQL: ${normalizedSql}`);
    }
  };
  await assert.rejects(
    fetchTableDefinitions(timedOutViewClient, undefined, undefined, ['schema_a']),
    /Failed to extract schema_a\.slow_view \(view\): Query read timeout/
  );

  const ddl = await generateCreateTableDDL(createClient(), 'jobs', 'schema_a');

  assert.match(ddl, /PRIMARY KEY \(id\)/);
  assert.doesNotMatch(ddl, /PRIMARY KEY \(id, id\)/);
  assert.match(ddl, /CONSTRAINT jobs_code_key UNIQUE \(crossload_code\)/);
  assert.doesNotMatch(ddl, /appdb_code/);

  console.log('✅ bounded settings, fail-closed extraction, and schema-aware pg_catalog constraints');
}

main().catch(error => {
  console.error('❌ bounded settings, fail-closed extraction, and schema-aware pg_catalog constraints');
  console.error(error);
  process.exit(1);
});
