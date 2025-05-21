// TypeScript型定義自動生成（最小雛形）
// 日本語コメント
import path from 'path';
import fs from 'fs';
import type { TableDef, ModelDef } from './types';

/**
 * モデルからTypeScript型定義ファイルを生成
 * @param model モデルオブジェクト
 * @param outPath 出力先パス
 */
export function generateTypesFromModel(model: any, outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let code = '// 自動生成: モデル型定義\n\n';
  for (const m of model.models) {
    const tables = m.tables || {};
    for (const [tableName, table] of Object.entries(tables as Record<string, TableDef>)) {
      const t = table;
      if (t.skipCreate) continue;
      code += `export type ${tableName} = {\n`;
      for (const [colName, col] of Object.entries(t.fields || {})) {
        const c = col as any;
        code += `  ${colName}: ${toTsType(c.type)};\n`;
      }
      code += `}\n\n`;
    }
  }
  fs.writeFileSync(outPath, code);
}

// 型変換ユーティリティ
function toTsType(type: string | undefined): string {
  if (!type) return 'any';
  switch (type) {
    case 'uuid':
    case 'text':
    case 'timestamp':
      return 'string';
    case 'int':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'any';
  }
} 