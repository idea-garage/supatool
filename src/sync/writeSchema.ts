import * as fs from 'fs';
import * as path from 'path';
import { askUserConfirmation } from './utils';

// グローバルな「全て承認」状態を管理
let globalApproveAll = false;

/**
 * 全て承認モードをリセット
 */
export function resetApprovalState(): void {
  globalApproveAll = false;
}

/**
 * 既存ファイルをバックアップディレクトリに移動
 */
async function backupExistingFile(filePath: string, schemaDir: string, force: boolean = false): Promise<boolean> {
  if (!fs.existsSync(filePath)) {
    return true;
  }

  if (!force && !globalApproveAll) {
    const fileName = path.basename(filePath);
    const response = await askUserConfirmation(`↓ 既存ファイル ${fileName} を上書きしますか？`, {
      allowAll: true,
      message: '(y/N/a[all]): '
    });
    
    if (response === 'all') {
      globalApproveAll = true;
      console.log('✅ すべてのファイルを承認します');
    } else if (response === false) {
      console.log('スキップしました');
      return false;
    }
  }

  const backupDir = path.join(schemaDir, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${timestamp}_${fileName}`;
  const backupPath = path.join(backupDir, backupFileName);

  fs.renameSync(filePath, backupPath);
  console.log(`既存ファイルをバックアップしました: ${backupPath}`);
  return true;
}

/**
 * 存在しないテーブルのファイルをバックアップに移動
 */
export async function backupOrphanedFiles(schemaDir: string, existingTables: Set<string>, force: boolean = false): Promise<void> {
  if (!fs.existsSync(schemaDir)) {
    return;
  }

  const files = fs.readdirSync(schemaDir);
  const orphanedFiles: string[] = [];
  
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    
    const tableName = path.basename(file, '.sql');
    if (!existingTables.has(tableName)) {
      orphanedFiles.push(file);
    }
  }

  if (orphanedFiles.length === 0) {
    return;
  }

  if (!force) {
    console.log('\n以下のファイルは存在しないテーブルに対応しています:');
    orphanedFiles.forEach(file => console.log(`  - ${file}`));
    
    const confirmed = await askUserConfirmation('これらのファイルをバックアップフォルダに移動しますか？');
    if (!confirmed) {
      console.log('孤児ファイルの移動をスキップしました');
      return;
    }
  }

  for (const file of orphanedFiles) {
    const tableName = path.basename(file, '.sql');
    const filePath = path.join(schemaDir, file);
    console.log(`[${tableName}] 存在しないテーブルのファイルをバックアップ`);
    await backupExistingFile(filePath, schemaDir, true); // 確認済みなのでforce=true
  }
}

/**
 * スキーマをファイルに書き込み
 */
export async function writeSchemaToFile(
  ddl: string,
  schemaDir: string,
  timestamp: number,
  fileName: string,
  tableName: string,
  force: boolean = false
): Promise<boolean> {
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }

  const filePath = path.join(schemaDir, fileName);
  
  // 既存ファイルがある場合はバックアップ
  const canProceed = await backupExistingFile(filePath, schemaDir, force);
  if (!canProceed) {
    return false;
  }
  
  // リモートデータベースの最終更新時刻を記録（比較用メタデータ - 編集禁止）
  const remoteTimestamp = `-- Remote last updated: ${new Date(timestamp * 1000).toISOString()}\n`;
  // 同期実行時刻（参考情報）
  const syncTimestamp = `-- Synced by supatool at: ${new Date().toISOString()}\n`;
  // 警告コメント
  const warningComment = `-- ⚠️  このファイルはsupatoolによって自動生成されます。手動編集は同期時に失われる可能性があります。\n`;
  const tableComment = `-- Table: ${tableName}\n\n`;
  const finalContent = remoteTimestamp + syncTimestamp + warningComment + tableComment + ddl;

  fs.writeFileSync(filePath, finalContent, 'utf-8');
  console.log(`📁 ${tableName}.sql に保存しました`);
  
  return true;
}

/**
 * 孤立したファイルをバックアップフォルダに移動
 */
export function moveToBackup(schemaDir: string, fileName: string): void {
  const backupDir = path.join(schemaDir, 'backup');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const sourceFile = path.join(schemaDir, fileName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `${path.basename(fileName, '.sql')}_${timestamp}.sql`);

  if (fs.existsSync(sourceFile)) {
    fs.renameSync(sourceFile, backupFile);
    console.log(`📦 ${fileName} を ${backupFile} にバックアップしました`);
  }
} 