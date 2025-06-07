import * as path from 'path';
import { parseLocalSchemas } from './parseLocalSchemas';
import { fetchRemoteSchemas } from './fetchRemoteSchemas';
import { writeSchemaToFile, backupOrphanedFiles, resetApprovalState } from './writeSchema';
import { generateMigrationFile } from './generateMigration';
import { diffLines, diffWords } from 'diff';
import { wildcardMatch, askUserConfirmation } from './utils';

// グローバル承認状態（writeSchema.tsと共有）
let globalApproveAll = false;

/**
 * DDL文字列を正規化（空白・改行・タブを統一）
 */
function normalizeDDL(ddl: string): string {
  return ddl
    .replace(/\s+/g, ' ')     // 連続する空白文字を1つのスペースに
    .replace(/;\s+/g, ';\n')  // セミコロン後に改行
    .trim();                  // 前後の空白を削除
}

/**
 * SQLを見やすく整形
 */
function formatSQL(sql: string): string {
  return sql
    .replace(/,\s*/g, ',\n  ')                    // カンマ後に改行とインデント
    .replace(/\(\s*/g, ' (\n  ')                  // 開き括弧後に改行とインデント
    .replace(/\s*\)/g, '\n)')                     // 閉じ括弧前に改行
    .replace(/\bCREATE\s+TABLE\b/g, '\nCREATE TABLE')  // CREATE TABLE前に改行
    .replace(/\bPRIMARY\s+KEY\b/g, '\n  PRIMARY KEY')   // PRIMARY KEY前に改行とインデント
    .replace(/;\s*/g, ';\n')                      // セミコロン後に改行
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n');
}

export interface SyncOptions {
  connectionString: string;
  schemaDir: string;
  tablePattern?: string;
  force?: boolean;
}

/**
 * すべてのテーブルスキーマを同期
 */
export async function syncAllTables({
  connectionString,
  schemaDir,
  tablePattern = '*',
  force = false
}: SyncOptions): Promise<void> {
  // 承認状態をリセット
  resetApprovalState();
  
  const localSchemas = await parseLocalSchemas(schemaDir);
  const remoteSchemas = await fetchRemoteSchemas(connectionString);

  const allTables = new Set([...Object.keys(localSchemas), ...Object.keys(remoteSchemas)]);
  const remoteTables = new Set(Object.keys(remoteSchemas));

  // 存在しないテーブルのファイルをバックアップ
  await backupOrphanedFiles(schemaDir, remoteTables, force);

  for (const tableName of allTables) {
    if (!wildcardMatch(tableName, tablePattern)) {
      continue;
    }

    const local = localSchemas[tableName];
    const remote = remoteSchemas[tableName];

    if (local && !remote) {
      console.log(`[${tableName}] ローカルのみ - リモートに存在しません（バックアップ済み）`);
    } else if (!local && remote) {
      console.log(`[${tableName}] リモートのみ - スキーマを取得`);
      const success = await writeSchemaToFile(remote.ddl, schemaDir, remote.timestamp, `${tableName}.sql`, tableName, force);
      if (success) {
        console.log(`[${tableName}] スキーマファイルを作成しました`);
      }
    } else if (local && remote) {
      // 最初にDDLの差分をチェック
      const normalizedLocal = local.normalizedDdl;
      const normalizedRemote = normalizeDDL(remote.ddl);
      const diff = diffLines(normalizedLocal, normalizedRemote);
      const hasDiff = diff.some(part => part.added || part.removed);
      
      // 差分がある場合のみ処理・表示
      if (hasDiff) {
        // タイムスタンプ比較（ローカルファイルの実際の更新時刻も考慮）
        const isRemoteNewer = remote.timestamp > local.timestamp;
        const isLocalFileNewer = local.fileTimestamp > remote.timestamp;
        const timeDiff = remote.timestamp - local.timestamp;
        const fileDiff = local.fileTimestamp - remote.timestamp;
        const timeDiffHours = Math.abs(timeDiff) / 3600;
        const fileDiffHours = Math.abs(fileDiff) / 3600;
        

        
        // ローカルファイルの方が新しい場合はリモートへマイグレーション提案
        if (isLocalFileNewer) {
          console.log(`[${tableName}] ローカルが ${fileDiffHours.toFixed(1)}時間新しい - マイグレーション生成`);
        } else if (isRemoteNewer) {
          console.log(`[${tableName}] リモートが ${timeDiffHours.toFixed(1)}時間新しい - ローカル更新`);
        } else {
          console.log(`[${tableName}] 差分を検出 - 確認が必要`);
        }
        
        // 整形されたSQLで行単位の差分を表示
        const formattedLocal = formatSQL(normalizedLocal);
        const formattedRemote = formatSQL(normalizedRemote);
        
        // ローカルが新しい場合は、ローカル→リモートの差分（マイグレーション用）
        // リモートが新しい場合は、リモート→ローカルの差分（ローカル更新用）
        const lineDiff = isLocalFileNewer 
          ? diffLines(formattedRemote, formattedLocal)  // ローカル→リモート（マイグレーション用）
          : diffLines(formattedLocal, formattedRemote); // リモート→ローカル（ローカル更新用）
        
        // 前後のコンテキスト行数
        const contextLines = 1;
        let lineNumber = 0;
        let outputLines: string[] = [];
        
        lineDiff.forEach((part, index) => {
          const lines = part.value.split('\n').filter(line => line.trim() || index === lineDiff.length - 1);
          
          if (part.added) {
            // リモートから追加される行
            lines.forEach(line => {
              if (line.trim()) {
                outputLines.push(`\x1b[32m+ ${line}\x1b[0m`);
              }
            });
          } else if (part.removed) {
            // ローカルから削除される行
            lines.forEach(line => {
              if (line.trim()) {
                outputLines.push(`\x1b[31m- ${line}\x1b[0m`);
              }
            });
          } else {
            // 変更されていない行（コンテキスト）
            const unchangedLines = lines.filter(line => line.trim());
            
            // 差分の前後で適切にコンテキストを表示
            const hasChangeBefore = index > 0 && (lineDiff[index - 1].added || lineDiff[index - 1].removed);
            const hasChangeAfter = index < lineDiff.length - 1 && (lineDiff[index + 1].added || lineDiff[index + 1].removed);
            
            if (hasChangeBefore && hasChangeAfter) {
              // 前後に変更がある場合は全行表示
              unchangedLines.forEach(line => {
                outputLines.push(`  ${line}`);
              });
            } else if (hasChangeBefore) {
              // 前に変更がある場合は最初の数行のみ表示
              const showLines = Math.min(contextLines, unchangedLines.length);
              for (let i = 0; i < showLines; i++) {
                outputLines.push(`  ${unchangedLines[i]}`);
              }
              if (unchangedLines.length > contextLines) {
                outputLines.push(`  \x1b[36m...(${unchangedLines.length - contextLines} more lines)...\x1b[0m`);
              }
            } else if (hasChangeAfter) {
              // 後に変更がある場合は最後の数行のみ表示
              const showLines = Math.min(contextLines, unchangedLines.length);
              const startIndex = unchangedLines.length - showLines;
              
              // 冒頭のCREATE TABLE行は常に表示
              const hasCreateTable = unchangedLines.some(line => line.trim().toUpperCase().startsWith('CREATE TABLE'));
              if (hasCreateTable && startIndex > 0) {
                // CREATE TABLE行を探して表示
                const createTableIndex = unchangedLines.findIndex(line => line.trim().toUpperCase().startsWith('CREATE TABLE'));
                if (createTableIndex >= 0) {
                  outputLines.push(`  ${unchangedLines[createTableIndex]}`);
                  if (createTableIndex < startIndex - 1) {
                    outputLines.push(`  \x1b[36m...(${startIndex - createTableIndex - 1} lines)...\x1b[0m`);
                  }
                }
              } else if (startIndex > 0) {
                outputLines.push(`  \x1b[36m...(${startIndex} lines)...\x1b[0m`);
              }
              
              for (let i = startIndex; i < unchangedLines.length; i++) {
                outputLines.push(`  ${unchangedLines[i]}`);
              }
            } else if (unchangedLines.length <= contextLines * 2) {
              // 短い場合は全部表示
              unchangedLines.forEach(line => {
                outputLines.push(`  ${line}`);
              });
            } else {
              // 長い場合でも冒頭のCREATE TABLE行は表示
              const hasCreateTable = unchangedLines.some(line => line.trim().toUpperCase().startsWith('CREATE TABLE'));
              if (hasCreateTable) {
                const createTableIndex = unchangedLines.findIndex(line => line.trim().toUpperCase().startsWith('CREATE TABLE'));
                if (createTableIndex >= 0) {
                  outputLines.push(`  ${unchangedLines[createTableIndex]}`);
                  if (unchangedLines.length > 1) {
                    outputLines.push(`  \x1b[36m...(${unchangedLines.length - 1} unchanged lines)...\x1b[0m`);
                  }
                }
              } else {
                outputLines.push(`  \x1b[36m...(${unchangedLines.length} unchanged lines)...\x1b[0m`);
              }
            }
          }
        });
        
        outputLines.forEach(line => console.log(line));
        
        if (isLocalFileNewer) {
          // マイグレーションファイルを生成（ローカル→リモートの差分）
          const migrationPath = await generateMigrationFile(
            tableName, 
            normalizedRemote,  // from（現在のリモート状態）
            normalizedLocal,   // to（ローカルの目標状態）
            process.cwd()
          );
        } else {
          // リモートが新しいかタイムスタンプが同じ場合：ローカルを更新
          const shouldAutoUpdate = isRemoteNewer && !isLocalFileNewer;
          const success = await writeSchemaToFile(remote.ddl, schemaDir, remote.timestamp, `${tableName}.sql`, tableName, shouldAutoUpdate);
          if (success) {
            console.log(`[${tableName}] ローカルファイルを更新しました`);
          }
        }
      }
      // 差分がない場合は何も表示せず、何もしない
    }
  }
} 