#!/usr/bin/env node

// 高度なCRUD生成テスト用スクリプト
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 高度なCRUDコード生成テスト開始...\n');

// テスト用のSupabase型定義ファイルを作成
const testTypesTs = `
export type Database = {
  public: {
    Tables: {
      workflows: {
        Row: {
          id: string;
          name: string;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description?: string;
          workflow_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          workflow_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          workflow_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      // ビューは空
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
`;

// テスト用ディレクトリを作成
const testDir = './test-advanced-output';
const sharedDir = path.join(testDir, 'shared');
if (!fs.existsSync(sharedDir)) {
  fs.mkdirSync(sharedDir, { recursive: true });
}

// テスト用型定義ファイルを作成
const testTypesPath = path.join(sharedDir, 'types.ts');
fs.writeFileSync(testTypesPath, testTypesTs);

try {
  console.log('📝 テスト用型定義ファイル作成: ' + testTypesPath);
  
  // 高度なCRUD生成テスト
  console.log('🔧 高度なCRUDコード生成中...');
  execSync(`node dist/index.js -i ${testDir}/shared/ -e ${testDir}/output/ --tables workflows,tasks -f`, { stdio: 'inherit' });
  
  // 生成されたファイルを確認
  console.log('\n✅ 生成されたファイル:');
  const crudDir = path.join(testDir, 'output/crud-autogen');
  if (fs.existsSync(crudDir)) {
    const files = fs.readdirSync(crudDir);
    files.forEach(file => {
      console.log(`  - ${file}`);
      const filePath = path.join(crudDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 分割代入形式のチェック
      const hasDestructuring = content.includes('({ ') && content.includes(' }: {');
      const hasModernNaming = content.includes('getWorkflowsById') || content.includes('getTasksById');
      const hasExports = content.includes('export async function');
      
      console.log(`    ✅ 分割代入形式: ${hasDestructuring ? '有' : '無'}`);
      console.log(`    ✅ モダンな命名: ${hasModernNaming ? '有' : '無'}`);
      console.log(`    ✅ export関数: ${hasExports ? '有' : '無'}`);
    });
  }
  
  console.log('\n🎉 高度なCRUD生成テスト完了！');
  
} catch (error) {
  console.error('❌ テスト失敗:', error.message);
  process.exit(1);
} 