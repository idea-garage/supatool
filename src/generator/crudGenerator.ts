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
    const capitalizedName = capitalize(tableName);
    
    let code = `// 自動生成: ${tableName}用CRUD関数\n\n`;
    code += `import { supabase } from '../client';\n`;
    code += `import type { ${tableName} } from '../types';\n\n`;
    
    // 型定義
    code += `// フィルター型定義\n`;
    code += `type FilterValue = string | number | boolean | null;\n`;
    code += `type Filters = Record<string, FilterValue | FilterValue[]>;\n\n`;
    
    // 全件取得関数（改良版）
    code += `/** 全件取得 */\n`;
    code += `export async function select${capitalizedName}Rows(): Promise<${tableName}[]> {\n`;
    code += `  try {\n`;
    code += `    const { data, error } = await supabase.from('${tableName}').select('*');\n`;
    code += `    if (error) {\n`;
    code += `      console.error('Error fetching all ${tableName}:', error);\n`;
    code += `      throw new Error(\`Failed to fetch ${tableName}: \${error.message}\`);\n`;
    code += `    }\n`;
    code += `    if (!data) {\n`;
    code += `      return [];\n`;
    code += `    }\n`;
    code += `    return data as ${tableName}[];\n`;
    code += `  } catch (error) {\n`;
    code += `    console.error('Unexpected error in select${capitalizedName}Rows:', error);\n`;
    code += `    throw error;\n`;
    code += `  }\n`;
    code += `}\n\n`;
    
    // IDで1件取得関数（改良版）
    code += `/** IDで1件取得 */\n`;
    code += `export async function select${capitalizedName}RowById({ id }: { id: string }): Promise<${tableName} | null> {\n`;
    code += `  if (!id) {\n`;
    code += `    throw new Error('ID is required');\n`;
    code += `  }\n`;
    code += `  try {\n`;
    code += `    const { data, error } = await supabase.from('${tableName}').select('*').eq('id', id).single();\n`;
    code += `    if (error) {\n`;
    code += `      // レコードが見つからない場合（PGRST116）は null を返す\n`;
    code += `      if (error.code === 'PGRST116') {\n`;
    code += `        return null;\n`;
    code += `      }\n`;
    code += `      console.error('Error fetching ${tableName} by ID:', error);\n`;
    code += `      throw new Error(\`Failed to fetch ${tableName} with ID \${id}: \${error.message}\`);\n`;
    code += `    }\n`;
    code += `    return data as ${tableName} | null;\n`;
    code += `  } catch (error) {\n`;
    code += `    console.error('Unexpected error in select${capitalizedName}RowById:', error);\n`;
    code += `    throw error;\n`;
    code += `  }\n`;
    code += `}\n\n`;
    
    // フィルターで検索関数
    code += `/** フィルターで複数件取得 */\n`;
    code += `export async function select${capitalizedName}RowsWithFilters({ filters }: { filters: Filters }): Promise<${tableName}[]> {\n`;
    code += `  // filtersのガード\n`;
    code += `  if (!filters || typeof filters !== 'object') return [];\n`;
    code += `  try {\n`;
    code += `    let query = supabase.from('${tableName}').select('*');\n`;
    code += `    \n`;
    code += `    // フィルターを適用\n`;
    code += `    for (const [key, value] of Object.entries(filters)) {\n`;
    code += `      if (Array.isArray(value)) {\n`;
    code += `        query = query.in(key, value);\n`;
    code += `      } else {\n`;
    code += `        query = query.eq(key, value);\n`;
    code += `      }\n`;
    code += `    }\n`;
    code += `    \n`;
    code += `    const { data, error } = await query;\n`;
    code += `    if (error) {\n`;
    code += `      console.error('Error fetching ${tableName} by filters:', error);\n`;
    code += `      throw new Error(\`Failed to fetch ${tableName}: \${error.message}\`);\n`;
    code += `    }\n`;
    code += `    return (data as unknown as ${tableName}[]) || [];\n`;
    code += `  } catch (error) {\n`;
    code += `    console.error('Unexpected error in select${capitalizedName}RowsWithFilters:', error);\n`;
    code += `    throw error;\n`;
    code += `  }\n`;
    code += `}\n\n`;
    
    // 作成関数
    code += `/** 新規作成 */\n`;
    code += `export async function insert${capitalizedName}Row({ data }: { data: Omit<${tableName}, 'id' | 'created_at' | 'updated_at'> }): Promise<${tableName}> {\n`;
    code += `  if (!data) {\n`;
    code += `    throw new Error('Data is required for creation');\n`;
    code += `  }\n`;
    code += `  try {\n`;
    code += `    const { data: createdData, error } = await supabase\n`;
    code += `      .from('${tableName}')\n`;
    code += `      .insert([data])\n`;
    code += `      .select()\n`;
    code += `      .single();\n`;
    code += `    if (error) {\n`;
    code += `      console.error('Error creating ${tableName}:', error);\n`;
    code += `      throw new Error(\`Failed to create ${tableName}: \${error.message}\`);\n`;
    code += `    }\n`;
    code += `    if (!createdData) {\n`;
    code += `      throw new Error('No data returned after creation');\n`;
    code += `    }\n`;
    code += `    return createdData as ${tableName};\n`;
    code += `  } catch (error) {\n`;
    code += `    console.error('Unexpected error in insert${capitalizedName}Row:', error);\n`;
    code += `    throw error;\n`;
    code += `  }\n`;
    code += `}\n\n`;
    
    // 更新関数
    code += `/** 更新 */\n`;
    code += `export async function update${capitalizedName}Row({ id, data }: { id: string; data: Partial<Omit<${tableName}, 'id' | 'created_at'>> }): Promise<${tableName}> {\n`;
    code += `  if (!id) {\n`;
    code += `    throw new Error('ID is required for update');\n`;
    code += `  }\n`;
    code += `  if (!data || Object.keys(data).length === 0) {\n`;
    code += `    throw new Error('Update data is required');\n`;
    code += `  }\n`;
    code += `  try {\n`;
    code += `    const { data: updatedData, error } = await supabase\n`;
    code += `      .from('${tableName}')\n`;
    code += `      .update(data)\n`;
    code += `      .eq('id', id)\n`;
    code += `      .select()\n`;
    code += `      .single();\n`;
    code += `    if (error) {\n`;
    code += `      if (error.code === 'PGRST116') {\n`;
    code += `        throw new Error(\`${tableName} with ID \${id} not found\`);\n`;
    code += `      }\n`;
    code += `      console.error('Error updating ${tableName}:', error);\n`;
    code += `      throw new Error(\`Failed to update ${tableName} with ID \${id}: \${error.message}\`);\n`;
    code += `    }\n`;
    code += `    if (!updatedData) {\n`;
    code += `      throw new Error(\`${tableName} with ID \${id} not found\`);\n`;
    code += `    }\n`;
    code += `    return updatedData as ${tableName};\n`;
    code += `  } catch (error) {\n`;
    code += `    console.error('Unexpected error in update${capitalizedName}Row:', error);\n`;
    code += `    throw error;\n`;
    code += `  }\n`;
    code += `}\n\n`;
    
    // 削除関数
    code += `/** 削除 */\n`;
    code += `export async function delete${capitalizedName}Row({ id }: { id: string }): Promise<boolean> {\n`;
    code += `  if (!id) {\n`;
    code += `    throw new Error('ID is required for deletion');\n`;
    code += `  }\n`;
    code += `  try {\n`;
    code += `    const { error } = await supabase\n`;
    code += `      .from('${tableName}')\n`;
    code += `      .delete()\n`;
    code += `      .eq('id', id);\n`;
    code += `    if (error) {\n`;
    code += `      console.error('Error deleting ${tableName}:', error);\n`;
    code += `      throw new Error(\`Failed to delete ${tableName} with ID \${id}: \${error.message}\`);\n`;
    code += `    }\n`;
    code += `    return true;\n`;
    code += `  } catch (error) {\n`;
    code += `    console.error('Unexpected error in delete${capitalizedName}Row:', error);\n`;
    code += `    throw error;\n`;
    code += `  }\n`;
    code += `}\n\n`;

    
    fs.writeFileSync(path.join(outDir, `${tableName}.ts`), code);
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
} 