import * as fs from 'fs';
import * as path from 'path';

export interface LocalSchema {
  ddl: string;
  normalizedDdl: string; // 比較用の正規化されたDDL
  timestamp: number;
  fileTimestamp: number; // ファイル自体の更新日時
  filePath: string;
}

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
 * ローカルSQLファイルからスキーマを解析
 */
export async function parseLocalSchemas(schemaDir: string): Promise<Record<string, LocalSchema>> {
  const schemas: Record<string, LocalSchema> = {};

  if (!fs.existsSync(schemaDir)) {
    return schemas;
  }

  const files = fs.readdirSync(schemaDir);
  
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    
    const filePath = path.join(schemaDir, file);
    const stats = fs.statSync(filePath);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // ファイル名からテーブル名を取得（.sqlを除く）
    const tableName = path.basename(file, '.sql');
    
    // ファイル内のコメントからタイムスタンプを抽出
    let timestamp = Math.floor(stats.mtime.getTime() / 1000); // フォールバック
    
    const timestampMatch = fileContent.match(/-- Remote last updated: (.+)/);
    if (timestampMatch) {
      try {
        const dateStr = timestampMatch[1];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          timestamp = Math.floor(parsedDate.getTime() / 1000);
        }
      } catch (error) {
        // エラーの場合はファイル更新日時を使用
      }
    }
    
    // DDL部分のみを抽出（コメント行と空白行を完全に除外）
    const ddlLines = fileContent.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    });
    const rawDDL = ddlLines.join('\n').trim();
    
    // DDLを正規化
    const ddl = normalizeDDL(rawDDL);
    
    schemas[tableName] = {
      ddl: rawDDL,
      normalizedDdl: normalizeDDL(rawDDL),
      timestamp,
      fileTimestamp: Math.floor(stats.mtime.getTime() / 1000),
      filePath
    };
  }

  return schemas;
} 