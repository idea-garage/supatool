// CRUD関数TypeScriptコード自動生成（Supabase実動作対応）
// 日本語コメント
import path from 'path';
import fs from 'fs';
import type { TableDef, ModelDef } from './types';

/**
 * dataSchemaまたはmodels/tablesから各テーブルごとのCRUD関数TypeScriptファイルを生成
 * @param model モデルオブジェクト
 * @param outDir 出力先ディレクトリ
 */
export function generateCrudFromModel(model: any, outDir: string) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
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
  for (const tableObj of tables) {
    if (tableObj.skipCreate) continue;
    const tableName = tableObj.tableName;
    let code = `// 自動生成: ${tableName}用CRUD関数\n\n`;
    code += `import { supabase } from '../client';\n`;
    code += `import type { ${tableName} } from '../types';\n\n`;
    code += `/** 全件取得 */\n`;
    code += `export async function getAll${capitalize(tableName)}(): Promise<${tableName}[]> {\n`;
    code += `  const { data, error } = await supabase.from('${tableName}').select('*');\n`;
    code += `  if (error) throw error;\n`;
    code += `  return data as ${tableName}[];\n`;
    code += `}\n\n`;
    code += `/** IDで1件取得 */\n`;
    code += `export async function get${capitalize(tableName)}ById(id: string): Promise<${tableName} | null> {\n`;
    code += `  const { data, error } = await supabase.from('${tableName}').select('*').eq('id', id).single();\n`;
    code += `  if (error) throw error;\n`;
    code += `  return data as ${tableName} | null;\n`;
    code += `}\n`;
    fs.writeFileSync(path.join(outDir, `${tableName}.ts`), code);
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
} 