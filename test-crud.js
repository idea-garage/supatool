#!/usr/bin/env node

// テスト用CRUD生成スクリプト
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 CRUDコード生成テスト開始...\n');

// テスト用のモデルYAMLファイルを作成
const testModelYaml = `
models:
  - name: ブログ
    tables:
      posts:
        description: "ブログ投稿"
        fields:
          id:
            type: uuid
            primary: true
            default: "gen_random_uuid()"
          title:
            type: text
            notNull: true
            label: "タイトル"
          content:
            type: text
            label: "内容"
          created_at:
            type: timestamptz
            default: "now()"
          updated_at:
            type: timestamptz
            default: "now()"
      users:
        description: "ユーザー"
        fields:
          id:
            type: uuid
            primary: true
            default: "gen_random_uuid()"
          email:
            type: text
            notNull: true
            label: "メールアドレス"
          name:
            type: text
            label: "名前"
          created_at:
            type: timestamptz
            default: "now()"
`;

// テスト用ディレクトリを作成
const testDir = './test-output';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// テスト用モデルファイルを作成
const testModelPath = path.join(testDir, 'test-model.yaml');
fs.writeFileSync(testModelPath, testModelYaml);

try {
  console.log('📝 テスト用モデルファイル作成: ' + testModelPath);
  
  // CRUD生成テスト
  console.log('🔧 CRUDコード生成中...');
  execSync(`node dist/bin/supatool.js gen:crud ${testModelPath} -o ${testDir}/crud`, { stdio: 'inherit' });
  
  // 生成されたファイルを確認
  console.log('\n✅ 生成されたファイル:');
  const crudDir = path.join(testDir, 'crud');
  if (fs.existsSync(crudDir)) {
    const files = fs.readdirSync(crudDir);
    files.forEach(file => {
      console.log(`  - ${file}`);
      const filePath = path.join(crudDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // エラーハンドリングのチェック
      const hasErrorHandling = content.includes('try {') && content.includes('catch (error)');
      const hasNullCheck = content.includes('if (!');
      const hasErrorMessages = content.includes('throw new Error');
      
      console.log(`    ✅ エラーハンドリング: ${hasErrorHandling ? '有' : '無'}`);
      console.log(`    ✅ nullチェック: ${hasNullCheck ? '有' : '無'}`);
      console.log(`    ✅ エラーメッセージ: ${hasErrorMessages ? '有' : '無'}`);
    });
  }
  
  console.log('\n🎉 テスト完了！');
  
} catch (error) {
  console.error('❌ テスト失敗:', error.message);
  process.exit(1);
} 