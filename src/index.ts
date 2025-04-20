/* eslint-disable @typescript-eslint/no-var-requires */
// Supabaseの型定義からTypeScriptのCRUDコードを生成する
// V0.1 2025-02-09 スキーマ名の動的取得に対応
// V0.2 2025-02-18 ビューのCRUD生成に対応
// V0.3 2025-02-19 CRUD生成を調整
// V0.4 2025-03-17 型定義をsharedフォルダに出力
// V0.5 2025-04-20 GitHub用cliツール化

// Supabaseの型定義をコマンドで生成しておく
// npx supabase gen types typescript --project-id "your-project-id" --schema public > shared/types.ts

// 実行（npm install -g tsx しておく）
// tsx .tools/generateCrud.ts

// selectFilteredRowsFunctionName
// selectFilteredSingleRowFunctionName
// insertFunctionName

// ID列がある場合のみ生成されるもの（主キー情報がSupabaseの型ファイルにないため）
// selectByIdFunctionName
// updateFunctionName
// deleteFunctionName
 

// v0.0.1 2025-02-02  初期バージョン作成

import { createSourceFile, ScriptTarget, SyntaxKind, createProgram } from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import type { Module } from 'module';
import path from 'path';

// コマンドライン引数からパスを取得（デフォルト値あり）
const args = process.argv.slice(2);
let importPath = 'shared/';
let exportPath = 'src/integrations/supabase/';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-i' && args[i + 1]) {
    importPath = args[i + 1];
    i++;
  } else if (args[i] === '-e' && args[i + 1]) {
    exportPath = args[i + 1];
    i++;
  }
}

// 絶対パスに変換
const resolvedImportPath = path.resolve(process.cwd(), importPath);
const resolvedExportPath = path.resolve(process.cwd(), exportPath);
const typeDefinitionsPath = path.join(resolvedImportPath, 'types.ts');
const crudFolderPath = path.join(resolvedExportPath, 'crud-autogen/');

// メイン処理を関数化
export function main(): void {
  // 型定義ファイルの存在チェック
  if (!existsSync(typeDefinitionsPath)) {
    console.error(`Error: Type definition file not found: ${typeDefinitionsPath}`);
    console.error('Please generate it with:');
    console.error('  npx supabase gen types typescript --project-id "your-project-id" --schema public > shared/types.ts');
    process.exit(1);
  }
  // 型定義ファイルを読む
  const typeDefinitions = readFileSync(typeDefinitionsPath, 'utf-8');
  // TypeScriptのパーサを使って型を解析
  const sourceFile = createSourceFile(
    typeDefinitionsPath,
    typeDefinitions,
    ScriptTarget.Latest
  );
  // プログラムを作成して型チェッカーを取得
  const program = createProgram([typeDefinitionsPath], {});
  const typeChecker = program.getTypeChecker();

  // スキーマ名を動的に取得するための関数
  const getSchemaName = (typeNode: any) => {
    return typeNode.members.find((member: any) => member.name && member.name.text)
      ?.name.text;
  };

  // 型を抽出する（Database型のみを対象）
  const types = sourceFile.statements
      .filter(stmt => stmt.kind === SyntaxKind.TypeAliasDeclaration)
      .flatMap(typeAliasDecl => {
          const typeName = (typeAliasDecl as any).name.text;
          const typeNode = (typeAliasDecl as any).type;
          if (typeNode.kind === SyntaxKind.TypeLiteral && typeName === 'Database') {
              const schemaName = getSchemaName(typeNode);
              const schemaType = typeNode.members.find((member: any) => 
                  member.name && member.name.text === schemaName
              );
              if (schemaType && schemaType.type.kind === SyntaxKind.TypeLiteral) {
                  const tablesAndViewsType = schemaType.type.members.filter((member: any) => 
                      member.name && (member.name.text === 'Tables' || member.name.text === 'Views')
                  );
                  return tablesAndViewsType.flatMap((tablesOrViewsType: any) => {
                      if (tablesOrViewsType.type.kind === SyntaxKind.TypeLiteral) {
                          return tablesOrViewsType.type.members.map((tableOrViewMember: any) => {
                              const tableName = tableOrViewMember.name.text;
                              const isView = tablesOrViewsType.name.text === 'Views';
                              const rowType = tableOrViewMember.type.members.find((member: any) => 
                                  member.name && member.name.text === 'Row'
                              );
                              if (rowType && rowType.type.kind === SyntaxKind.TypeLiteral) {
                                  const fields = rowType.type.members.map((member: any) => {
                                      if (member.name && member.name.kind === SyntaxKind.Identifier) {
                                          const name = member.name.getText(sourceFile);
                                          const type = member.type ? member.type.getText(sourceFile) : 'unknown';
                                          return { name, type };
                                      }
                                      return { name: 'unknown', type: 'unknown' };
                                  });
                                  return { typeName: tableName, fields, isView };
                              }
                              return null;
                          }).filter((type: any) => type !== null);
                      }
                      return [];
                  });
              }
          }
          return [];
      });

  // 生成処理の開始を表示
  console.log(`Import path: ${importPath}`);
  console.log(`Export path: ${exportPath}`);
  // CRUDフォルダが存在しない場合は作成
  if (!existsSync(crudFolderPath)) {
    mkdirSync(crudFolderPath, { recursive: true });
  }

  // 型ごとのCRUDコード生成を実行
  types.forEach(type => {
    const fileName = toLowerCamelCase(type.typeName);
    const crudCode = crudTemplate(type.typeName, type.fields, type.isView);
    const filePath = crudFolderPath + `${fileName}.ts`;

    // コンソールで確認
    if (type.isView) {
      console.log(`Generating select operations only for view: ${fileName}`);
    } else {
      console.log(`Generating full CRUD operations for table: ${fileName}`);
    }

    // ファイルのディレクトリが存在しない場合は作成
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    writeFileSync(filePath, crudCode);
    console.log(`Generated ${fileName}.ts`);
  });

  console.log("CRUD operations have been generated.");
}

// Function to convert a string to lower camel case
const toLowerCamelCase = (str: string) => {
  return str.split('_').map((word, index) => 
    index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join('');
};

// Function to convert a string to upper camel case
const toUpperCamelCase = (str: string) => {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  };


// CRUDテンプレートを修正
const crudTemplate = (typeName: string, fields: any[], isView: boolean) => {

    const upperCamelTypeName = toUpperCamelCase(typeName);
    const selectByIdFunctionName = 'select' + upperCamelTypeName + 'RowById';
    const selectFilteredRowsFunctionName = 'select' + upperCamelTypeName + 'RowsWithFilters';
    const selectFilteredSingleRowFunctionName = 'select' + upperCamelTypeName + 'SingleRowWithFilters';
    const insertFunctionName = 'insert' + upperCamelTypeName + 'Row';
    const updateFunctionName = 'update' + upperCamelTypeName + 'Row';
    const deleteFunctionName = 'delete' + upperCamelTypeName + 'Row';
    const idType = fields.find((field: any) => field.name === 'id')?.type;
    const hasIdColumn = idType !== undefined; // Check if 'id' column exists

    const exportHeaders = 
`// Supabase CRUD operations for ${typeName}
// This file is automatically generated. Do not edit it directly.
import { supabase } from "../client";
import { Tables, TablesInsert, TablesUpdate } from "@shared/types";

type ${typeName} = Tables<'${typeName}'>;
type FilterTypesValue = string | number | boolean | null | Record<string, any>;
type Filters = Record<string, FilterTypesValue | FilterTypesValue[]>;
`;


const exportSelectById = 
`
// Read single row using id
async function ${selectByIdFunctionName}(id: ${idType}): Promise<${typeName} | ${typeName}[]> {
    if (id !== undefined) {
        const result = await supabase
            .from('${typeName.toLowerCase()}')
            .select('*')
            .eq('id', id)
            .single();
        return result.data as ${typeName};
    }
    const result = await supabase.from('${typeName.toLowerCase()}').select('*');
    return result.data as ${typeName}[];
}
`;

const exportSelectQueries = 
`
  // Function to apply filters to a query
function applyFilters(query: any, filters: Filters): any {
    for (const [key, value] of Object.entries(filters)) {
        if (Array.isArray(value)) {
            query = query.in(key, value); // Use 'in' for array values
        } else if (typeof value === 'object' && value !== null) {
            for (const [operator, val] of Object.entries(value)) {
                switch (operator) {
                    case 'eq':
                        query = query.eq(key, val);
                        break;
                    case 'neq':
                        query = query.neq(key, val);
                        break;
                    case 'like':
                        query = query.like(key, val);
                        break;
                    case 'ilike':
                        query = query.ilike(key, val);
                        break;
                    case 'lt':
                        query = query.lt(key, val);
                        break;
                    case 'lte':
                        query = query.lte(key, val);
                        break;
                    case 'gte':
                        query = query.gte(key, val);
                        break;
                    case 'gt':
                        query = query.gt(key, val);
                        break;
                    case 'contains':
                        query = query.contains(key, val);
                        break;
                    case 'contains_any':
                        query = query.contains_any(key, val);
                        break;
                    case 'contains_all':
                        query = query.contains_all(key, val);
                        break;
                    // Add more operators as needed
                    default:
                        throw new Error('Unsupported operator: ' + operator);
                }
            }
        } else {
            query = query.eq(key, value); // Default to 'eq' for simple values
        }
    }
    return query;
}

// Read multiple rows with dynamic filters
async function ${selectFilteredRowsFunctionName}(filters: Filters = {}): Promise<${typeName}[]> {
    let query = supabase.from('${typeName.toLowerCase()}').select('*');
    query = applyFilters(query, filters);

    const result = await query;
    return result.data as ${typeName}[];
}

// Read a single row with dynamic filters
async function ${selectFilteredSingleRowFunctionName}(filters: Filters = {}): Promise<${typeName}> {
    let query = supabase.from('${typeName.toLowerCase()}').select('*');
    query = applyFilters(query, filters).single();

    const result = await query;
    return result.data as unknown as ${typeName};
}
`


const exportInsertOperation = isView ? '' : 
`
// Create Function
async function ${insertFunctionName}(data: TablesInsert<'${typeName}'>): Promise<${typeName}> {
    const result = await supabase
        .from('${typeName}')
        .insert([data])
        .select()
        .single();

    if (result.data) {
        return result.data as ${typeName};
    }
    throw new Error('Failed to insert data');
}
`;

const exportUpdateOperation = isView ? '' : 
`
// Update Function
async function ${updateFunctionName}(data: TablesUpdate<'${typeName}'> & { id: ${idType} }): Promise<${typeName}> {
    const result = await supabase.from('${typeName.toLowerCase()}').update(data).eq('id', data.id).select().single();
    if (result.data) {
        return result.data as ${typeName};
    }
    throw new Error('Failed to update data');
}
`;

const exportDeleteOperation = isView ? '' : 
`
// Delete Function
async function ${deleteFunctionName}(id: ${idType}): Promise<${typeName}> {
    const result = await supabase.from('${typeName.toLowerCase()}').delete().eq('id', id).select().single();
    if (result.data) {
        return result.data as ${typeName};
    }
    throw new Error('Failed to delete data');
}
`;

// エクスポートする関数をまとめる
const exportAll = 
`
export { ${selectFilteredRowsFunctionName}, ${selectFilteredSingleRowFunctionName}${hasIdColumn ? ', ' + selectByIdFunctionName : ''}${isView ? '' : ', ' + insertFunctionName + ', ' + updateFunctionName + ', ' + deleteFunctionName} };
`;

// Return all the code
return exportHeaders + exportSelectQueries + (hasIdColumn ? exportSelectById : '') + exportInsertOperation + exportUpdateOperation + exportDeleteOperation + exportAll;
}

// console.log(crudFolderPath);
// console.log(types);