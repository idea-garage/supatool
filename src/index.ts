/* eslint-disable @typescript-eslint/no-var-requires */
// Generate TypeScript CRUD code from Supabase type definitions

import { createSourceFile, ScriptTarget, SyntaxKind, createProgram } from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import type { Module } from 'module';
import path from 'path';

// Get paths from command line arguments (with default values)
const args = process.argv.slice(2);
let importPath = 'shared/';
let exportPath = 'src/integrations/supabase/';
let tables: string[] | null = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-i' && args[i + 1]) {
    importPath = args[i + 1];
    i++;
  } else if (args[i] === '-e' && args[i + 1]) {
    exportPath = args[i + 1];
    i++;
  } else if ((args[i] === '--tables' || args[i] === '-t') && args[i + 1]) {
    tables = args[i + 1].split(',').map((t) => t.trim());
    i++;
  }
}

// Convert to absolute paths
const resolvedImportPath = path.resolve(process.cwd(), importPath);
const resolvedExportPath = path.resolve(process.cwd(), exportPath);
const typeDefinitionsPath = path.join(resolvedImportPath, 'types.ts');
const crudFolderPath = path.join(resolvedExportPath, 'crud-autogen/');

// Main process as a function
export function main(): void {
  // Check --force option
  const force = process.argv.includes('--force') || process.argv.includes('-f');

  // Check if type definition file exists
  if (!existsSync(typeDefinitionsPath)) {
    console.error(`Error: Type definition file not found: ${typeDefinitionsPath}`);
    console.error('Please generate it with:');
    console.error('  npx supabase gen types typescript --project-id "your-project-id" --schema public > shared/types.ts');
    process.exit(1);
  }

  // Check if output folder exists
  if (existsSync(crudFolderPath) && !force) {
    // Confirm via standard input
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Output folder already exists: ${crudFolderPath}\nOverwrite? (y/N): `, (answer: string) => {
      rl.close();
      if (answer.toLowerCase() !== 'y') {
        console.log('Canceled.');
        process.exit(0);
      } else {
        generateCrud();
      }
    });
    return;
  }
  generateCrud();

  function generateCrud() {
    // Read type definition file
    const typeDefinitions = readFileSync(typeDefinitionsPath, 'utf-8');
    // Parse types using TypeScript parser
    const sourceFile = createSourceFile(
      typeDefinitionsPath,
      typeDefinitions,
      ScriptTarget.Latest
    );
    // Create program and get type checker
    const program = createProgram([typeDefinitionsPath], {});
    const typeChecker = program.getTypeChecker();

    // Function to get schema name dynamically
    const getSchemaName = (typeNode: any) => {
      return typeNode.members.find((member: any) => member.name && member.name.text)
        ?.name.text;
    };

    // Extract types (only Database type)
    const types = sourceFile.statements
        .filter(stmt => stmt.kind === SyntaxKind.TypeAliasDeclaration)
        .flatMap(typeAliasDecl => {
            const typeName = (typeAliasDecl as any).name.text;
            const typeNode = (typeAliasDecl as any).type;
            if (typeNode.kind === SyntaxKind.TypeLiteral && typeName === 'Database') {
                console.log('Found Database type, processing schemas...');
                // Database型内の全てのスキーマを処理
                return typeNode.members.flatMap((schemaMember: any) => {
                    if (schemaMember.name && schemaMember.type && schemaMember.type.kind === SyntaxKind.TypeLiteral) {
                        const schemaName = schemaMember.name.text;
                        console.log(`Processing schema: ${schemaName}`);
                        const schemaType = schemaMember.type;
                        
                        // スキーマ内のTablesとViewsを処理
                        const tablesAndViewsType = schemaType.members.filter((member: any) => 
                            member.name && (member.name.text === 'Tables' || member.name.text === 'Views')
                        );
                        
                        return tablesAndViewsType.flatMap((tablesOrViewsType: any) => {
                            if (tablesOrViewsType.type.kind === SyntaxKind.TypeLiteral) {
                                const tableCount = tablesOrViewsType.type.members.length;
                                console.log(`Found ${tableCount} ${tablesOrViewsType.name.text} in schema ${schemaName}`);
                                return tablesOrViewsType.type.members.map((tableOrViewMember: any) => {
                                    const tableName = tableOrViewMember.name.text;
                                    const isView = tablesOrViewsType.name.text === 'Views';
                                    console.log(`Processing ${isView ? 'view' : 'table'}: ${tableName}`);
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
                                        return { typeName: tableName, fields, isView, schema: schemaName };
                                    }
                                    return null;
                                }).filter((type: any) => type !== null);
                            }
                            return [];
                        });
                    }
                    return [];
                });
            }
            return [];
        });

    console.log(`Total types found: ${types.length}`);
    types.forEach(type => {
        console.log(`- ${type.schema}.${type.typeName} (${type.isView ? 'view' : 'table'}) with ${type.fields.length} fields`);
    });

    // Show start of generation process
    console.log(`Import path: ${importPath}`);
    console.log(`Export path: ${exportPath}`);
    // Create CRUD folder if it does not exist
    if (!existsSync(crudFolderPath)) {
      mkdirSync(crudFolderPath, { recursive: true });
    }

    // Generate CRUD code for each type
    types
      .filter(type => {
        // If tables are specified, generate only for those table names
        if (tables && tables.length > 0) {
          return tables.includes(type.typeName);
        }
        return true;
      })
      .forEach(type => {
        // スキーマごとにフォルダ分け
        const schemaFolder = path.join(crudFolderPath, type.schema);
        if (!existsSync(schemaFolder)) {
          mkdirSync(schemaFolder, { recursive: true });
        }
        const fileName = toLowerCamelCase(type.typeName);
        // スキーマフォルダ分けがある場合のインポートパス調整
        const hasSchemaFolders = types.some(t => t.schema !== type.schema);
        const crudCode = crudTemplate(type.typeName, type.fields, type.isView, type.schema, hasSchemaFolders);
        const filePath = path.join(schemaFolder, `${fileName}.ts`);

        // Show in console
        if (type.isView) {
          console.log(`Generating select operations only for view: ${type.schema}/${fileName}`);
        } else {
          console.log(`Generating full CRUD operations for table: ${type.schema}/${fileName}`);
        }

        writeFileSync(filePath, crudCode);
        console.log(`Generated ${type.schema}/${fileName}.ts`);
      });

    console.log("CRUD operations have been generated.");
  }
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

// CRUDテンプレート本体 - エレガントな文字列生成
const crudTemplate = (typeName: string, fields: any[], isView: boolean, schema: string, hasSchemaFolders: boolean) => {
  const upperCamelTypeName = toUpperCamelCase(typeName);
  const getByIdFunctionName = 'select' + upperCamelTypeName + 'RowById';
  const getByFiltersFunctionName = 'select' + upperCamelTypeName + 'RowsWithFilters';
  const getSingleByFiltersFunctionName = 'select' + upperCamelTypeName + 'SingleRowWithFilters';
  const createFunctionName = 'insert' + upperCamelTypeName + 'Row';
  const updateFunctionName = 'update' + upperCamelTypeName + 'Row';
  const deleteFunctionName = 'delete' + upperCamelTypeName + 'Row';
  const idType = fields.find((field: any) => field.name === 'id')?.type || 'string';

  // インポートパスを動的に調整
  const importPath = hasSchemaFolders ? '../../client' : '../client';

  // ヘッダー部分
  const header = [
    `// Supabase CRUD operations for ${typeName} (${schema} schema)`,
    '// 自動生成ファイル',
    `import { supabase } from "${importPath}";`,
    'import { Tables, TablesInsert, TablesUpdate } from "@shared/types";',
    '',
    `type ${typeName} = Tables<'${typeName}'>;`,
    'type FilterTypesValue = string | number | boolean | null | Record<string, any>;',
    'type Filters = Record<string, FilterTypesValue | FilterTypesValue[]>;',
    ''
  ].join('\n');

  // フィルター適用関数
  const filterFunction = [
    '/**',
    ' * フィルター適用関数',
    ' */',
    'function applyFilters(query: any, filters: Filters): any {',
    '  for (const [key, value] of Object.entries(filters)) {',
    '    if (Array.isArray(value)) {',
    '      query = query.in(key, value);',
    '    } else if (typeof value === "object" && value !== null) {',
    '      for (const [operator, val] of Object.entries(value)) {',
    '        switch (operator) {',
    '          case "eq": query = query.eq(key, val); break;',
    '          case "neq": query = query.neq(key, val); break;',
    '          case "like": query = query.like(key, val); break;',
    '          case "ilike": query = query.ilike(key, val); break;',
    '          case "lt": query = query.lt(key, val); break;',
    '          case "lte": query = query.lte(key, val); break;',
    '          case "gte": query = query.gte(key, val); break;',
    '          case "gt": query = query.gt(key, val); break;',
    '          case "contains": query = query.contains(key, val); break;',
    '          case "contains_any": query = query.contains_any(key, val); break;',
    '          case "contains_all": query = query.contains_all(key, val); break;',
    '          default: throw new Error("Unsupported operator: " + operator);',
    '        }',
    '      }',
    '    } else {',
    '      query = query.eq(key, value);',
    '    }',
    '  }',
    '  return query;',
    '}',
    ''
  ].join('\n');

  // IDで1件取得
  const selectById = [
    '/**',
    ' * IDで1件取得',
    ' */',
    `export async function ${getByIdFunctionName}({ id }: { id: ${idType} }): Promise<${typeName} | null> {`,
    '  if (!id) throw new Error("ID is required");',
    '  try {',
    '    const result = await supabase',
    `      .schema("${schema}")`,
    `      .from("${typeName.toLowerCase()}")`,
    '      .select("*")',
    '      .eq("id", id)',
    '      .single();',
    '    if (result.error) {',
    '      if (result.error.code === "PGRST116") return null;',
    `      throw new Error(\`Failed to fetch ${typeName}: \${result.error.message}\`);`,
    '    }',
    `    return result.data as ${typeName};`,
    '  } catch (error) {',
    `    console.error("Error in ${getByIdFunctionName}:", error);`,
    '    throw error;',
    '  }',
    '}',
    ''
  ].join('\n');

  // フィルターで複数取得
  const selectMultiple = [
    '/**',
    ' * フィルターで複数取得',
    ' */',
    `export async function ${getByFiltersFunctionName}({ filters }: { filters: Filters }): Promise<${typeName}[]> {`,
    '  if (!filters || typeof filters !== "object") return [];',
    '  try {',
    `    let query = supabase.schema("${schema}").from("${typeName.toLowerCase()}").select("*");`,
    '    query = applyFilters(query, filters);',
    '    const result = await query;',
    `    if (result.error) throw new Error(\`Failed to fetch ${typeName}: \${result.error.message}\`);`,
    `    return (result.data as unknown as ${typeName}[]) || [];`,
    '  } catch (error) {',
    `    console.error("Error in ${getByFiltersFunctionName}:", error);`,
    '    throw error;',
    '  }',
    '}',
    ''
  ].join('\n');

  // フィルターで1件取得
  const selectSingle = [
    '/**',
    ' * フィルターで1件取得',
    ' */',
    `export async function ${getSingleByFiltersFunctionName}({ filters }: { filters: Filters }): Promise<${typeName} | null> {`,
    '  if (!filters || typeof filters !== "object") return null;',
    '  try {',
    `    let query = supabase.schema("${schema}").from("${typeName.toLowerCase()}").select("*");`,
    '    query = applyFilters(query, filters).single();',
    '    const result = await query;',
    '    if (result.error) {',
    '      if (result.error.code === "PGRST116") return null;',
    `      throw new Error(\`Failed to fetch ${typeName}: \${result.error.message}\`);`,
    '    }',
    `    return result.data as unknown as ${typeName};`,
    '  } catch (error) {',
    `    console.error("Error in ${getSingleByFiltersFunctionName}:", error);`,
    '    throw error;',
    '  }',
    '}',
    ''
  ].join('\n');

  // 追加（ビューでない場合のみ）
  const insertOperation = isView ? '' : [
    '/**',
    ' * 追加',
    ' */',
    `export async function ${createFunctionName}({ data }: { data: TablesInsert<"${typeName}"> }): Promise<${typeName}> {`,
    '  if (!data) throw new Error("Data is required for creation");',
    '  try {',
    '    const result = await supabase',
    `      .schema("${schema}")`,
    `      .from("${typeName.toLowerCase()}")`,
    '      .insert([data])',
    '      .select()',
    '      .single();',
    `    if (result.error) throw new Error(\`Failed to create ${typeName}: \${result.error.message}\`);`,
    '    if (!result.data) throw new Error("No data returned after creation");',
    `    return result.data as ${typeName};`,
    '  } catch (error) {',
    `    console.error("Error in ${createFunctionName}:", error);`,
    '    throw error;',
    '  }',
    '}',
    ''
  ].join('\n');

  // 更新（ビューでない場合のみ）
  const updateOperation = isView ? '' : [
    '/**',
    ' * 更新',
    ' */',
    `export async function ${updateFunctionName}({ id, data }: { id: ${idType}; data: TablesUpdate<"${typeName}"> }): Promise<${typeName}> {`,
    '  if (!id) throw new Error("ID is required for update");',
    '  if (!data || Object.keys(data).length === 0) throw new Error("Update data is required");',
    '  try {',
    '    const result = await supabase',
    `      .schema("${schema}")`,
    `      .from("${typeName.toLowerCase()}")`,
    '      .update(data)',
    '      .eq("id", id)',
    '      .select()',
    '      .single();',
    '    if (result.error) {',
    `      if (result.error.code === "PGRST116") throw new Error(\`${typeName} with ID \${id} not found\`);`,
    `      throw new Error(\`Failed to update ${typeName}: \${result.error.message}\`);`,
    '    }',
    `    if (!result.data) throw new Error(\`${typeName} with ID \${id} not found\`);`,
    `    return result.data as ${typeName};`,
    '  } catch (error) {',
    `    console.error("Error in ${updateFunctionName}:", error);`,
    '    throw error;',
    '  }',
    '}',
    ''
  ].join('\n');

  // 削除（ビューでない場合のみ）
  const deleteOperation = isView ? '' : [
    '/**',
    ' * 削除',
    ' */',
    `export async function ${deleteFunctionName}({ id }: { id: ${idType} }): Promise<boolean> {`,
    '  if (!id) throw new Error("ID is required for deletion");',
    '  try {',
    '    const result = await supabase',
    `      .schema("${schema}")`,
    `      .from("${typeName.toLowerCase()}")`,
    '      .delete()',
    '      .eq("id", id);',
    `    if (result.error) throw new Error(\`Failed to delete ${typeName}: \${result.error.message}\`);`,
    '    return true;',
    '  } catch (error) {',
    `    console.error("Error in ${deleteFunctionName}:", error);`,
    '    throw error;',
    '  }',
    '}',
    ''
  ].join('\n');

  // 全体を結合
  return header + filterFunction + selectById + selectMultiple + selectSingle + insertOperation + updateOperation + deleteOperation;
};