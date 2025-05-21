// ドキュメント生成（最小雛形）
// 日本語コメント
import path from 'path';
import fs from 'fs';
import type { TableDef, ModelDef } from './types';

/**
 * テーブル定義書（Markdown）を生成して保存
 * @param model モデルオブジェクト
 * @param outPath 出力先パス
 */
export function generateTableDocMarkdown(model: any, outPath: string) {
  // 出力先ディレクトリを作成
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let md = '# テーブル定義書\n\n';
  for (const m of model.models) {
    const tables = m.tables || {};
    for (const [tableName, table] of Object.entries(tables as Record<string, TableDef>)) {
      const t = table;
      let skipNote = t.skipCreate ? '（作成不要: Supabase組み込み）' : '';
      md += `## ${tableName}${skipNote}\n`;
      if (t.description) md += `${t.description}\n`;
      md += '\n| カラム | 型 | 主キー | NotNull | デフォルト | ラベル |\n|---|---|---|---|---|---|\n';
      for (const [colName, col] of Object.entries(t.fields || {})) {
        const c = col as any;
        md += `| ${colName} | ${c.type || ''} | ${c.primary ? '★' : ''} | ${c.notNull ? '○' : ''} | ${c.default || ''} | ${c.label || ''} |\n`;
      }
      md += '\n';
    }
  }
  fs.writeFileSync(outPath, md);
}

/**
 * リレーション一覧（Markdown）を生成して保存
 * @param model モデルオブジェクト
 * @param outPath 出力先パス
 */
export function generateRelationsMarkdown(model: any, outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let md = '# リレーション一覧\n\n| テーブル | 関係 | 対象 | 外部キー |\n|---|---|---|---|\n';
  for (const m of model.models) {
    const tables = m.tables || {};
    for (const [tableName, table] of Object.entries(tables as Record<string, TableDef>)) {
      const t = table;
      for (const [relName, rel] of Object.entries(t.relations || {})) {
        const r = rel as any;
        md += `| ${tableName} | ${r.type || ''} | ${r.target || ''} | ${r.foreignKey || ''} |\n`;
      }
    }
  }
  fs.writeFileSync(outPath, md);
} 