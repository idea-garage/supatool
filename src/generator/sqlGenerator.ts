// SQL auto-generation (table・relation minimal template)
import path from 'path';
import fs from 'fs';
import type { TableDef, ModelDef } from './types';

/**
 * Generate table definitions and relation SQL from model
 * @param model Model object
 * @param outPath Output path
 */
export function generateSqlFromModel(model: any, outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // dataSchema/models: get table list
  let tables: any[] = [];
  if (Array.isArray(model.dataSchema)) {
    tables = model.dataSchema.map((t: any) => ({ tableName: t.tableName || t.raw, ...t }));
  } else if (Array.isArray(model.models)) {
    for (const m of model.models) {
      if (m.tables) {
        for (const [tableName, table] of Object.entries(m.tables)) {
          tables.push(Object.assign({ tableName }, table));
        }
      }
    }
  }
  let sql = '-- Auto-generated: table・relation DDL\n\n';
  for (const tableObj of tables) {
    const t = tableObj;
    const tableName = tableObj.tableName;
    if (t.skipCreate) {
      // Skip-create tables (e.g. auth.users) noted in comment
      sql += `-- [skip] ${tableName} (skip: Supabase built-in etc.)\n`;
      continue;
    }
    // Auto-naming for user_id columns
    const userIdFields = Object.entries(t.fields || {}).filter(([colName, col]) => {
      const c = col as any;
      return (colName === 'user_id' || (c.ref && c.ref.endsWith('user_profiles.id')));
    });
    let userIdCount = userIdFields.length;
    sql += `CREATE TABLE ${tableName} (\n`;
    const colDefs = [];
    const tableConstraints = [];
    for (const [colName, col] of Object.entries(t.fields || {})) {
      const c = col as any;
      let actualColName = colName;
      // Apply user_id column naming rule
      if ((colName !== 'user_id') && c.ref && c.ref.endsWith('user_profiles.id')) {
        if (userIdCount === 1) {
          actualColName = 'user_id';
        } else {
          // ref_table_user_id
          const refTable = c.ref.split('.')[0];
          actualColName = `${refTable}_user_id`;
        }
      }
      let def = `  ${actualColName} ${toSqlType(c.type, actualColName)}`;
      if (c.notNull) def += ' NOT NULL';
      if (c.default) def += ` DEFAULT ${c.default}`;
      colDefs.push(def);
    }
    // Primary key constraint (with constraint name)
    const pkCols = Object.entries(t.fields || {})
      .filter(([_, col]) => (col as any).primary)
      .map(([colName, _]) => colName);
    if (pkCols.length > 0) {
      tableConstraints.push(`  CONSTRAINT ${tableName}_pkey PRIMARY KEY (${pkCols.join(', ')})`);
    }
    // Unique constraint (with constraint name)
    if (Array.isArray(t.uniques)) {
      for (const unique of t.uniques) {
        if (Array.isArray(unique.columns) && unique.name) {
          tableConstraints.push(`  CONSTRAINT ${unique.name} UNIQUE (${unique.columns.join(', ')})`);
        }
      }
    }
    // Foreign key constraint (with constraint name)
    if (Array.isArray(t.foreignKeys)) {
      for (const fk of t.foreignKeys) {
        if (fk.name && fk.columns && fk.refTable && fk.refColumns) {
          let fkStr = `  CONSTRAINT ${fk.name} FOREIGN KEY (${fk.columns.join(', ')}) REFERENCES ${fk.refTable} (${fk.refColumns.join(', ')})`;
          if (fk.onDelete) fkStr += ` ON DELETE ${fk.onDelete}`;
          if (fk.onUpdate) fkStr += ` ON UPDATE ${fk.onUpdate}`;
          tableConstraints.push(fkStr);
        }
      }
    }
    // Check constraint (with constraint name)
    if (Array.isArray(t.checkConstraints)) {
      for (const check of t.checkConstraints) {
        if (check.name) {
          tableConstraints.push(`  CONSTRAINT ${check.name} CHECK (${check.expression})`);
        } else {
          tableConstraints.push(`  CHECK (${check.expression})`);
        }
      }
    }
    // Join column defs and table-level constraints
    const defs = [...colDefs, ...tableConstraints];
    sql += defs.join(',\n') + '\n);\n\n';
    sql += '\n';
  }
  fs.writeFileSync(outPath, sql);
}

function toSqlType(type: string | undefined, colName: string): string {
  if (!type) return 'text';
  // Timestamp columns always timestamptz
  if (type === 'timestamp' || type === 'timestamptz' || colName.endsWith('_at')) return 'timestamptz';
  // vector type support
  if (/^vector(\(\d+\))?$/i.test(type)) return type;
  // extensions.vector -> vector
  const extVectorMatch = type.match(/^extensions\.vector(\(\d+\))?$/i);
  if (extVectorMatch) {
    return `vector${extVectorMatch[1] || ''}`;
  }
  switch (type) {
    case 'uuid': return 'uuid';
    case 'text': return 'text';
    case 'int':
    case 'integer': return 'integer';
    case 'boolean': return 'boolean';
    default: return type; // unknown type: pass through
  }
} 