#!/usr/bin/env node

const assert = require('assert');
const { generateCreateTableDDL } = require('../dist/sync/definitionExtractor');

const schemaAwareConstraintJoin = /tc\.constraint_catalog\s*=\s*kcu\.constraint_catalog[\s\S]*tc\.constraint_schema\s*=\s*kcu\.constraint_schema[\s\S]*tc\.constraint_name\s*=\s*kcu\.constraint_name/;

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

      if (normalizedSql.includes("tc.constraint_type = 'PRIMARY KEY'")) {
        assert.deepStrictEqual(params, ['schema_a', 'jobs']);
        assert.match(normalizedSql, /tc\.table_schema = \$1/);
        assert.match(normalizedSql, /tc\.table_name = \$2/);
        // schema_b.jobs also has jobs_pkey(id). A name-only join would return both rows.
        return result(schemaAwareConstraintJoin.test(sql)
          ? [{ column_name: 'id' }]
          : [{ column_name: 'id' }, { column_name: 'id' }]);
      }

      if (normalizedSql.includes("tc.constraint_type = 'UNIQUE'")) {
        assert.deepStrictEqual(params, ['schema_a', 'jobs']);
        assert.match(normalizedSql, /tc\.table_schema = \$1/);
        assert.match(normalizedSql, /tc\.table_name = \$2/);
        // Both schemas have jobs_code_key, but each constraint covers a different column.
        return result(schemaAwareConstraintJoin.test(sql)
          ? [{ constraint_name: 'jobs_code_key', columns: 'crossload_code' }]
          : [{ constraint_name: 'jobs_code_key', columns: 'crossload_code, appdb_code' }]);
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
  const ddl = await generateCreateTableDDL(createClient(), 'jobs', 'schema_a');

  assert.match(ddl, /PRIMARY KEY \(id\)/);
  assert.doesNotMatch(ddl, /PRIMARY KEY \(id, id\)/);
  assert.match(ddl, /CONSTRAINT jobs_code_key UNIQUE \(crossload_code\)/);
  assert.doesNotMatch(ddl, /appdb_code/);

  console.log('✅ schema-aware PK and UNIQUE extraction');
}

main().catch(error => {
  console.error('❌ schema-aware PK and UNIQUE extraction');
  console.error(error);
  process.exit(1);
});
