// SQL自動生成（テーブル・リレーション最小雛形）
// 日本語コメント
import path from 'path';
import fs from 'fs';
import type { TableDef, ModelDef } from './types';

/**
 * モデルからテーブル定義・リレーションSQLを生成
 * @param model モデルオブジェクト
 * @param outPath 出力先パス
 */
export function generateSqlFromModel(model: any, outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // dataSchema/models両対応: テーブル一覧取得
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
  let sql = '-- 自動生成: テーブル・リレーションDDL\n\n';
  for (const tableObj of tables) {
    const t = tableObj;
    const tableName = tableObj.tableName;
    if (t.skipCreate) {
      // auth.usersなど作成不要テーブルはコメントで明示
      sql += `-- [skip] ${tableName}（作成不要: Supabase組み込み等）\n`;
      continue;
    }
    // ユーザーIDカラムの自動命名調整
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
      // ユーザーIDカラム命名ルール適用
      if ((colName !== 'user_id') && c.ref && c.ref.endsWith('user_profiles.id')) {
        if (userIdCount === 1) {
          actualColName = 'user_id';
        } else {
          // 参照先テーブル名_user_id
          const refTable = c.ref.split('.')[0];
          actualColName = `${refTable}_user_id`;
        }
      }
      let def = `  ${actualColName} ${toSqlType(c.type, actualColName)}`;
      if (c.notNull) def += ' NOT NULL';
      if (c.default) def += ` DEFAULT ${c.default}`;
      colDefs.push(def);
    }
    // 主キー制約（constraint名付き）
    const pkCols = Object.entries(t.fields || {})
      .filter(([_, col]) => (col as any).primary)
      .map(([colName, _]) => colName);
    if (pkCols.length > 0) {
      tableConstraints.push(`  CONSTRAINT ${tableName}_pkey PRIMARY KEY (${pkCols.join(', ')})`);
    }
    // ユニーク制約（constraint名付き）
    if (Array.isArray(t.uniques)) {
      for (const unique of t.uniques) {
        if (Array.isArray(unique.columns) && unique.name) {
          tableConstraints.push(`  CONSTRAINT ${unique.name} UNIQUE (${unique.columns.join(', ')})`);
        }
      }
    }
    // 外部キー制約（constraint名付き）
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
    // チェック制約（constraint名付き）
    if (Array.isArray(t.checkConstraints)) {
      for (const check of t.checkConstraints) {
        if (check.name) {
          tableConstraints.push(`  CONSTRAINT ${check.name} CHECK (${check.expression})`);
        } else {
          tableConstraints.push(`  CHECK (${check.expression})`);
        }
      }
    }
    // 列定義 + テーブルレベル制約を結合
    const defs = [...colDefs, ...tableConstraints];
    sql += defs.join(',\n') + '\n);\n\n';
    sql += '\n';
  }
  fs.writeFileSync(outPath, sql);
}

function toSqlType(type: string | undefined, colName: string): string {
  if (!type) return 'text';
  // 時刻列は必ずtimestamptz
  if (type === 'timestamp' || type === 'timestamptz' || colName.endsWith('_at')) return 'timestamptz';
  // vector型サポート
  if (/^vector(\(\d+\))?$/i.test(type)) return type;
  // extensions.vector → vector へ変換
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
    default: return type; // 指定が未知の場合はそのまま返す
  }
} 