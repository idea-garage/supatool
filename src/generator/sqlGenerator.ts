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
      if (c.primary) def += ' PRIMARY KEY';
      if (c.unique) def += ' UNIQUE';
      if (c.notNull) def += ' NOT NULL';
      if (c.default) def += ` DEFAULT ${c.default}`;
      // 外部キー制約はテーブル末尾に付与するため保留
      colDefs.push(def);

      // 外部キー制約をテーブル末尾に格納
      if (c.ref) {
        const refTable = c.ref.split('.')[0];
        tableConstraints.push(`  FOREIGN KEY (${actualColName}) REFERENCES ${refTable}(id)`);
      }
    }
    // 列定義 + テーブルレベル制約を結合
    const defs = [...colDefs, ...tableConstraints];
    sql += defs.join(',\n') + '\n);\n\n';
    // ALTER TABLEによる外部キー制約は出力しない
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