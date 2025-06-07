import { Client } from 'pg';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export interface RemoteSchema {
  ddl: string;
  timestamp: number;
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
 * リモートSupabaseからスキーマを取得
 */
export async function fetchRemoteSchemas(connectionString: string): Promise<Record<string, RemoteSchema>> {
  const schemas: Record<string, RemoteSchema> = {};
  
  // console.log('データベースに接続中...');
  
  try {
    // 接続文字列の基本チェック
    if (!connectionString || !connectionString.startsWith('postgresql://')) {
      throw new Error('無効な接続文字列です。postgresql://で始まる形式で指定してください。');
    }

    // URL解析して接続先を表示
    const url = new URL(connectionString);
    console.log(`接続先: ${url.hostname}:${url.port}`);
    console.log(`ユーザー: ${url.username}`);

    // パスワードに特殊文字が含まれている場合の対処
    const decodedPassword = decodeURIComponent(url.password || '');
    
    // 接続文字列を再構築（パスワードを適切にエンコード）
    const encodedPassword = encodeURIComponent(decodedPassword);
    
    // Session poolerのモードを明示的に指定
    let reconstructedConnectionString = `postgresql://${url.username}:${encodedPassword}@${url.hostname}:${url.port}${url.pathname}`;
    
    // Session poolingモードのパラメータを追加
    const searchParams = new URLSearchParams(url.search);
    searchParams.set('sslmode', 'require');
    searchParams.set('application_name', 'supatool');
    
    reconstructedConnectionString += `?${searchParams.toString()}`;

    // IPv4を優先に変更
    dns.setDefaultResultOrder('ipv4first');

    // DNS解決テスト
    try {
      const addresses = await dns.promises.lookup(url.hostname, { all: true });
    } catch (dnsError) {
      console.error('❌ DNS解決に失敗しました');
      throw dnsError;
    }

    // Session pooler用の設定
    const clientConfig = {
      connectionString: reconstructedConnectionString,
      ssl: {
        rejectUnauthorized: false
      },
      // Session pooler用の追加設定
      statement_timeout: 30000,
      query_timeout: 30000,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000
    };

    console.log('Session pooler経由で接続中...');
    let client;
    
    try {
      client = new Client(clientConfig);
      await client.connect();
    } catch (sslError) {
      if (sslError instanceof Error && (
        sslError.message.includes('SASL') || 
        sslError.message.includes('SCRAM') ||
        sslError.message.includes('certificate') ||
        sslError.message.includes('SELF_SIGNED_CERT')
      )) {
        console.log('SSL接続不可のため、SSL無効化で再試行中...');
        
        // SSL無効化バージョンを試行
        const noSslConnectionString = reconstructedConnectionString.replace('sslmode=require', 'sslmode=disable');
        const noSslConfig = {
          ...clientConfig,
          connectionString: noSslConnectionString,
          ssl: false
        };
        
        try {
          client = new Client(noSslConfig);
          await client.connect();
          console.log('SSL無効化での接続に成功');
        } catch (noSslError) {
          if (noSslError instanceof Error && (noSslError.message.includes('SASL') || noSslError.message.includes('SCRAM'))) {
            console.log('Session poolerでSASLエラー継続。Direct connectionで再試行中...');
            
            // Direct connection (ポート5432) で再試行
            const directConnectionString = noSslConnectionString.replace('pooler.supabase.com:5432', 'supabase.co:5432');
            const directConfig = {
              ...noSslConfig,
              connectionString: directConnectionString
            };
            
            client = new Client(directConfig);
            await client.connect();
            console.log('Direct connectionでの接続に成功');
          } else {
            throw noSslError;
          }
        }
      } else {
        throw sslError;
      }
    }

    // 接続テストクエリ
    const testResult = await client.query('SELECT version()');

    // テーブル一覧を取得
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`リモートテーブル：${tablesResult.rows.length}`);

    // ローディングアニメーション用
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinnerIndex = 0;
    
    const startTime = Date.now();
    const spinnerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(`\r${spinner[spinnerIndex]} スキーマ取得中... ${elapsed}s`);
      spinnerIndex = (spinnerIndex + 1) % spinner.length;
    }, 100);

    // 各テーブルのスキーマ情報を取得
    for (const row of tablesResult.rows) {
      const tableName = row.tablename;

      // テーブルの最終更新時刻を取得（複数の方法を試行）
      let timestamp = Math.floor(Date.now() / 1000); // デフォルト値
      
                    // pg_stat_user_tablesから取得
       try {
         const tableStatsResult = await client.query(`
           SELECT 
             EXTRACT(EPOCH FROM GREATEST(
               COALESCE(last_vacuum, '1970-01-01'::timestamp),
               COALESCE(last_autovacuum, '1970-01-01'::timestamp),
               COALESCE(last_analyze, '1970-01-01'::timestamp),
               COALESCE(last_autoanalyze, '1970-01-01'::timestamp)
             ))::bigint as last_updated
           FROM pg_stat_user_tables 
           WHERE relname = $1 AND schemaname = 'public'
         `, [tableName]);

        if (tableStatsResult.rows.length > 0 && tableStatsResult.rows[0].last_updated > 0) {
          timestamp = tableStatsResult.rows[0].last_updated;
        } else {
          // デフォルトタイムスタンプ（十分に古い固定値）
          timestamp = Math.floor(new Date('2020-01-01').getTime() / 1000);
        }
       } catch (statsError) {
          // デフォルトタイムスタンプ（十分に古い固定値）
          timestamp = Math.floor(new Date('2020-01-01').getTime() / 1000);
         }

      // カラム情報を取得
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // 主キー情報を取得
      const primaryKeyResult = await client.query(`
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
      `, [tableName]);

      // CREATE TABLE文を生成
      let ddl = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      
      const columnDefs: string[] = [];
      for (const col of columnsResult.rows) {
        let colDef = `  ${col.column_name} ${col.data_type.toUpperCase()}`;
        
        // 長さ指定
        if (col.character_maximum_length) {
          colDef += `(${col.character_maximum_length})`;
        }
        
        // NOT NULL制約
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }
        
        // デフォルト値
        if (col.column_default) {
          colDef += ` DEFAULT ${col.column_default}`;
        }
        
        columnDefs.push(colDef);
      }
      
      ddl += columnDefs.join(',\n');
      
      // 主キー制約
      if (primaryKeyResult.rows.length > 0) {
        const pkColumns = primaryKeyResult.rows.map(row => row.column_name);
        ddl += `,\n  PRIMARY KEY (${pkColumns.join(', ')})`;
      }

      // UNIQUE制約を取得してCREATE TABLE内に含める
      const uniqueConstraintResult = await client.query(`
        SELECT 
          tc.constraint_name,
          string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'UNIQUE'
        GROUP BY tc.constraint_name
        ORDER BY tc.constraint_name
      `, [tableName]);

      // UNIQUE制約をCREATE TABLE内に追加
      for (const unique of uniqueConstraintResult.rows) {
        ddl += `,\n  CONSTRAINT ${unique.constraint_name} UNIQUE (${unique.columns})`;
      }

      // CHECK制約は一時的に無効化（NOT NULL制約と重複するため）
      // const checkConstraintResult = await client.query(`...`);

      // CHECK制約をCREATE TABLE内に追加は一時的に無効化
      // for (const check of checkConstraintResult.rows) {
      //   ddl += `,\n  CONSTRAINT ${check.constraint_name} CHECK ${check.check_clause}`;
      // }
      
      ddl += '\n);';

      // 外部キー制約のみを別途生成
      const foreignKeyResult = await client.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc 
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.constraint_name
      `, [tableName]);

      // 外部キー制約のみをALTER TABLE文として追加
      for (const fk of foreignKeyResult.rows) {
        ddl += `\n\nALTER TABLE ${tableName} ADD CONSTRAINT ${fk.constraint_name}`;
        ddl += ` FOREIGN KEY (${fk.column_name})`;
        ddl += ` REFERENCES ${fk.foreign_table_name} (${fk.foreign_column_name})`;
        
        if (fk.delete_rule && fk.delete_rule !== 'NO ACTION') {
          ddl += ` ON DELETE ${fk.delete_rule}`;
        }
        if (fk.update_rule && fk.update_rule !== 'NO ACTION') {
          ddl += ` ON UPDATE ${fk.update_rule}`;
        }
        ddl += ';';
      }

      // インデックス情報を取得
      const indexResult = await client.query(`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename = $1
          AND indexname NOT LIKE '%_pkey'
          AND indexname NOT IN (
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints tc
            WHERE tc.table_name = $1 AND tc.constraint_type = 'UNIQUE'
          )
        ORDER BY indexname
      `, [tableName]);

      // インデックスを追加
      for (const idx of indexResult.rows) {
        ddl += `\n\n${idx.indexdef};`;
      }

      // DDLを元の形式で保存
      schemas[tableName] = {
        ddl,
        timestamp
      };
    }

    // ローディングアニメーション停止
    clearInterval(spinnerInterval);
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(`\rSchema fetch completed (${totalTime}s)                    \n`);

    await client.end();
    
  } catch (error) {
    console.error('❌ Remote schema fetch error:');
    
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        console.error('🌐 DNS resolution error: Host not found');
        console.error('💡 Check:');
        console.error('   - Is your internet connection working?');
        console.error('   - Is your Supabase project connection string correct?');
      } else if (error.message.includes('authentication failed')) {
        console.error('🔐 Authentication error: Incorrect username or password');
      } else if (error.message.includes('SASL') || error.message.includes('SCRAM')) {
        console.error('🔐 SASL authentication error: Password or connection settings issue');
        console.error('💡 Session pooler connection checklist:');
        console.error('   - Reset database password in Supabase dashboard');
        console.error('   - Update connection string with new password');
        console.error('   - URL encode special characters in password if needed');
        console.error('   - Ensure project is not paused');
        console.error('   - Supabase Dashboard → Settings → Database → Reset database password');
      } else if (error.message.includes('connect ETIMEDOUT')) {
        console.error('⏰ Connection timeout: Cannot reach database server');
      } else {
        console.error(`🐛 ${error.message}`);
      }
    }
    
    console.error('\n📖 Session pooler connection setup:');
    console.error('1. Supabase Dashboard → Settings → Database');
    console.error('2. Select "Session pooler" tab');
    console.error('3. Reset password (Reset database password)');
    console.error('4. Set new connection string in .env.local');
    
    throw error;
  }
  
  return schemas;
} 