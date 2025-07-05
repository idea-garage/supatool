import { Client } from 'pg';

export interface TableDefinition {
  name: string;
  type: 'table' | 'view' | 'rls' | 'function' | 'trigger' | 'cron' | 'type';
  ddl: string;
  timestamp: number;
  category?: string; // テーブル名やオブジェクト名
  comment?: string; // コメント
}

export interface DefinitionExtractOptions {
  connectionString: string;
  outputDir: string;
  separateDirectories?: boolean;
  tablesOnly?: boolean;
  viewsOnly?: boolean;
  all?: boolean;
  tablePattern?: string;
  force?: boolean;
  schemas?: string[]; // 対象スキーマ（デフォルト: ['public']）
}

interface ProgressTracker {
  tables: { current: number; total: number };
  views: { current: number; total: number };
  rls: { current: number; total: number };
  functions: { current: number; total: number };
  triggers: { current: number; total: number };
  cronJobs: { current: number; total: number };
  customTypes: { current: number; total: number };
}

/**
 * 進行状況を表示
 */
// グローバルなプログレス状態を保存
let globalProgress: ProgressTracker | null = null;
let progressUpdateInterval: NodeJS.Timeout | null = null;

function displayProgress(progress: ProgressTracker, spinner: any) {
  // グローバル状態を更新
  globalProgress = progress;
  
  // 定期更新を開始（まだ開始していない場合）
  if (!progressUpdateInterval) {
    progressUpdateInterval = setInterval(() => {
      if (globalProgress && spinner) {
        updateSpinnerDisplay(globalProgress, spinner);
      }
    }, 80); // 80msで常時更新
  }
  
  // 即座に表示を更新
  updateSpinnerDisplay(progress, spinner);
}

function updateSpinnerDisplay(progress: ProgressTracker, spinner: any) {
  // 全体進捗を計算
  const totalObjects = progress.tables.total + progress.views.total + progress.rls.total + 
                      progress.functions.total + progress.triggers.total + progress.cronJobs.total + 
                      progress.customTypes.total;
  const completedObjects = progress.tables.current + progress.views.current + progress.rls.current + 
                          progress.functions.current + progress.triggers.current + progress.cronJobs.current + 
                          progress.customTypes.current;

  // プログレスバーを生成（稲妻が単純に増えていく）
  const createProgressBar = (current: number, total: number, width: number = 20) => {
    if (total === 0) return '░'.repeat(width);
    
    const percentage = Math.min(current / total, 1);
    const filled = Math.floor(percentage * width);
    const empty = width - filled;
    
    // 稲妻で単純に埋める（文字の入れ替えなし）
    return '⚡'.repeat(filled) + '░'.repeat(empty);
  };

  // 全体プログレスバーのみ表示（コンソール幅に収める）
  const overallBar = createProgressBar(completedObjects, totalObjects, 20);
  const overallPercent = totalObjects > 0 ? Math.floor((completedObjects / totalObjects) * 100) : 0;
  
  // 緑色回転スピナー（常時回転）
  const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const spinnerFrame = Math.floor((Date.now() / 80) % spinnerFrames.length);
  const greenSpinner = `\x1b[32m${spinnerFrames[spinnerFrame]}\x1b[0m`;
  
  // ドットアニメーション
  const dotFrames = ["", ".", "..", "..."];
  const dotFrame = Math.floor((Date.now() / 400) % dotFrames.length);
  
  // 解析中メッセージ
  const statusMessage = "Extracting";
  
  // 改行制御付きコンパクト表示（緑色スピナー付き）
  const display = `\r${greenSpinner} [${overallBar}] ${overallPercent}% (${completedObjects}/${totalObjects}) ${statusMessage}${dotFrames[dotFrame]}`;
  
  spinner.text = display;
}

// 進捗表示を停止する関数
function stopProgressDisplay() {
  if (progressUpdateInterval) {
    clearInterval(progressUpdateInterval);
    progressUpdateInterval = null;
  }
  globalProgress = null;
}

/**
 * RLSポリシーを取得
 */
async function fetchRlsPolicies(client: Client, spinner?: any, progress?: ProgressTracker, schemas: string[] = ['public']): Promise<TableDefinition[]> {
  const policies: TableDefinition[] = [];
  
  try {
    const schemaPlaceholders = schemas.map((_, index) => `$${index + 1}`).join(', ');
    const result = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE schemaname IN (${schemaPlaceholders})
      ORDER BY schemaname, tablename, policyname
    `, schemas);

  const groupedPolicies: { [key: string]: any[] } = {};
  
  for (const row of result.rows) {
    const tableKey = `${row.schemaname}.${row.tablename}`;
    if (!groupedPolicies[tableKey]) {
      groupedPolicies[tableKey] = [];
    }
    groupedPolicies[tableKey].push(row);
  }

  const tableKeys = Object.keys(groupedPolicies);
  
  // 進行状況の初期化
  if (progress) {
    progress.rls.total = tableKeys.length;
  }
  
  for (let i = 0; i < tableKeys.length; i++) {
    const tableKey = tableKeys[i];
    const tablePolicies = groupedPolicies[tableKey];
    const firstPolicy = tablePolicies[0];
    const schemaName = firstPolicy.schemaname;
    const tableName = firstPolicy.tablename;
    
    // 進行状況を更新
    if (progress && spinner) {
      progress.rls.current = i + 1;
      displayProgress(progress, spinner);
    }
    // RLSポリシー説明を先頭に追加
    let ddl = `-- RLS Policies for ${schemaName}.${tableName}\n`;
    ddl += `-- Row Level Security policies to control data access at the row level\n\n`;
    
    ddl += `ALTER TABLE ${schemaName}.${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
    
    for (const policy of tablePolicies) {
      ddl += `CREATE POLICY ${policy.policyname}\n`;
      ddl += `  ON ${schemaName}.${tableName}\n`;
      ddl += `  AS ${policy.permissive || 'PERMISSIVE'}\n`;
      ddl += `  FOR ${policy.cmd || 'ALL'}\n`;
      
      if (policy.roles) {
        // rolesが配列の場合と文字列の場合を処理
        let roles: string;
        if (Array.isArray(policy.roles)) {
          roles = policy.roles.join(', ');
        } else {
          // PostgreSQLの配列リテラル形式 "{role1,role2}" または単純な文字列を処理
          roles = String(policy.roles)
            .replace(/[{}]/g, '') // 中括弧を除去
            .replace(/"/g, ''); // ダブルクォートを除去
        }
        
        if (roles && roles.trim() !== '') {
          ddl += `  TO ${roles}\n`;
        }
      }
      
      if (policy.qual) {
        ddl += `  USING (${policy.qual})\n`;
      }
      
      if (policy.with_check) {
        ddl += `  WITH CHECK (${policy.with_check})\n`;
      }
      
      ddl += ';\n\n';
    }
    
    policies.push({
      name: `${schemaName}_${tableName}_policies`,
      type: 'rls',
      category: `${schemaName}.${tableName}`,
      ddl,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
  
  return policies;
  
  } catch (error) {
    console.warn('Skipping RLS policies extraction:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * 関数を取得
 */
async function fetchFunctions(client: Client, spinner?: any, progress?: ProgressTracker, schemas: string[] = ['public']): Promise<TableDefinition[]> {
  const functions: TableDefinition[] = [];
  
  const schemaPlaceholders = schemas.map((_, index) => `$${index + 1}`).join(', ');
  const result = await client.query(`
    SELECT 
      p.proname as name,
      pg_get_functiondef(p.oid) as definition,
      n.nspname as schema_name,
      obj_description(p.oid) as comment,
      pg_get_function_identity_arguments(p.oid) as identity_args,
      pg_get_function_arguments(p.oid) as full_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN (${schemaPlaceholders})
      AND p.prokind IN ('f', 'p') -- functions and procedures
    ORDER BY n.nspname, p.proname
  `, schemas);

  // 進行状況の初期化
  if (progress) {
    progress.functions.total = result.rows.length;
  }

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    
    // 進行状況を更新
    if (progress && spinner) {
      progress.functions.current = i + 1;
      displayProgress(progress, spinner);
    }
    
    // 正確な関数シグネチャを構築（スキーマ名と引数の型を含む）
    const functionSignature = `${row.schema_name}.${row.name}(${row.identity_args || ''})`;
    
    // 関数コメントを先頭に追加
    let ddl = '';
    if (!row.comment) {
      ddl += `-- Function: ${functionSignature}\n`;
    } else {
      ddl += `-- ${row.comment}\n`;
    }
    
    // 関数定義を追加（セミコロンを確実に付与）
    let functionDef = row.definition;
    if (!functionDef.trim().endsWith(';')) {
      functionDef += ';';
    }
    ddl += functionDef + '\n\n';
    
    // COMMENT ON文を追加
    if (!row.comment) {
      ddl += `-- COMMENT ON FUNCTION ${functionSignature} IS '_your_comment_here_';\n\n`;
    } else {
      ddl += `COMMENT ON FUNCTION ${functionSignature} IS '${row.comment}';\n\n`;
    }
    
    functions.push({
      name: row.name,
      type: 'function',
      ddl,
      comment: row.comment,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
  
  return functions;
}

/**
 * トリガーを取得
 */
async function fetchTriggers(client: Client, spinner?: any, progress?: ProgressTracker, schemas: string[] = ['public']): Promise<TableDefinition[]> {
  const triggers: TableDefinition[] = [];
  
  const schemaPlaceholders = schemas.map((_, index) => `$${index + 1}`).join(', ');
  const result = await client.query(`
    SELECT 
      t.tgname as trigger_name,
      c.relname as table_name,
      n.nspname as schema_name,
      pg_get_triggerdef(t.oid) as definition
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname IN (${schemaPlaceholders})
      AND NOT t.tgisinternal
    ORDER BY n.nspname, c.relname, t.tgname
  `, schemas);

  // 進行状況の初期化
  if (progress) {
    progress.triggers.total = result.rows.length;
  }

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    
    // 進行状況を更新
    if (progress && spinner) {
      progress.triggers.current = i + 1;
      displayProgress(progress, spinner);
    }
    
    // トリガー説明を先頭に追加
    let ddl = `-- Trigger: ${row.trigger_name} on ${row.schema_name}.${row.table_name}\n`;
    ddl += `-- Database trigger that automatically executes in response to certain events\n\n`;
    ddl += row.definition + ';';
    
    triggers.push({
      name: `${row.schema_name}_${row.table_name}_${row.trigger_name}`,
      type: 'trigger',
      category: `${row.schema_name}.${row.table_name}`,
      ddl,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
  
  return triggers;
}

/**
 * Cronジョブを取得（pg_cron拡張）
 */
async function fetchCronJobs(client: Client, spinner?: any, progress?: ProgressTracker): Promise<TableDefinition[]> {
  const cronJobs: TableDefinition[] = [];
  
  try {
    const result = await client.query(`
      SELECT 
        jobid,
        schedule,
        command,
        jobname,
        active
      FROM cron.job
      ORDER BY jobid
    `);

    // 進行状況の初期化
    if (progress) {
      progress.cronJobs.total = result.rows.length;
    }

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      
      // 進行状況を更新
      if (progress && spinner) {
        progress.cronJobs.current = i + 1;
        displayProgress(progress, spinner);
      }
      
      // Cronジョブ説明を先頭に追加
      let ddl = `-- Cron Job: ${row.jobname || `job_${row.jobid}`}\n`;
      ddl += `-- Scheduled job that runs automatically at specified intervals\n`;
      ddl += `-- Schedule: ${row.schedule}\n`;
      ddl += `-- Command: ${row.command}\n\n`;
      ddl += `SELECT cron.schedule('${row.jobname || `job_${row.jobid}`}', '${row.schedule}', '${row.command}');`;
                 
      cronJobs.push({
        name: row.jobname || `job_${row.jobid}`,
        type: 'cron',
        ddl,
        timestamp: Math.floor(Date.now() / 1000)
      });
    }
  } catch (error) {
    // pg_cron拡張がない場合はスキップ
  }
  
  return cronJobs;
}

/**
 * カスタム型を取得
 */
async function fetchCustomTypes(client: Client, spinner?: any, progress?: ProgressTracker, schemas: string[] = ['public']): Promise<TableDefinition[]> {
  const types: TableDefinition[] = [];
  
  const schemaPlaceholders = schemas.map((_, index) => `$${index + 1}`).join(', ');
  const result = await client.query(`
    SELECT 
      t.typname as type_name,
      n.nspname as schema_name,
      pg_catalog.format_type(t.oid, NULL) as type_definition,
      obj_description(t.oid) as comment,
      CASE 
        WHEN t.typtype = 'e' THEN 'enum'
        WHEN t.typtype = 'c' THEN 'composite'
        WHEN t.typtype = 'd' THEN 'domain'
        ELSE 'other'
      END as type_category,
      t.typtype
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname IN (${schemaPlaceholders})
      AND t.typtype IN ('e', 'c', 'd')
      AND t.typisdefined = true  -- 定義済みの型のみ
      AND NOT t.typarray = 0     -- 配列の基底型を除外
      AND NOT EXISTS (
        -- テーブル、ビュー、インデックス、シーケンス、複合型と同名のものを除外
        SELECT 1 FROM pg_class c 
        WHERE c.relname = t.typname 
          AND c.relnamespace = n.oid
      )
      AND NOT EXISTS (
        -- 関数・プロシージャと同名のものを除外
        SELECT 1 FROM pg_proc p
        WHERE p.proname = t.typname
          AND p.pronamespace = n.oid
      )
      AND t.typname NOT LIKE 'pg_%'     -- PostgreSQL内部型を除外
      AND t.typname NOT LIKE '_%'       -- 配列型（アンダースコアで始まる）を除外
      AND t.typname NOT LIKE '%_old'    -- 削除予定の型を除外
      AND t.typname NOT LIKE '%_bak'    -- バックアップ型を除外
      AND t.typname NOT LIKE 'tmp_%'    -- 一時的な型を除外
    ORDER BY n.nspname, t.typname
  `, schemas);

  // 進行状況の初期化
  if (progress) {
    progress.customTypes.total = result.rows.length;
  }

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    
    // 進行状況を更新
    if (progress && spinner) {
      progress.customTypes.current = i + 1;
      displayProgress(progress, spinner);
    }
    
    let ddl = '';
    
    if (row.type_category === 'enum') {
      // ENUM型の詳細を取得
      const enumResult = await client.query(`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = (
          SELECT oid FROM pg_type 
          WHERE typname = $1 AND typnamespace = (
            SELECT oid FROM pg_namespace WHERE nspname = $2
          )
        )
        ORDER BY enumsortorder
      `, [row.type_name, row.schema_name]);
      
      // ENUM値が存在する場合のみDDLを生成
      if (enumResult.rows.length > 0) {
        const labels = enumResult.rows.map(r => `'${r.enumlabel}'`).join(', ');
        ddl = `CREATE TYPE ${row.type_name} AS ENUM (${labels});`;
      }
    } else if (row.type_category === 'composite') {
      // COMPOSITE型の詳細を取得
      const compositeResult = await client.query(`
        SELECT 
          a.attname as column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) as column_type
        FROM pg_attribute a
        WHERE a.attrelid = (
          SELECT typrelid FROM pg_type 
          WHERE typname = $1 AND typnamespace = (
            SELECT oid FROM pg_namespace WHERE nspname = $2
          )
        )
        AND a.attnum > 0
        AND NOT a.attisdropped  -- 削除されたカラムを除外
        ORDER BY a.attnum
      `, [row.type_name, row.schema_name]);
      
      // コンポジット型の属性が存在する場合のみDDLを生成
      if (compositeResult.rows.length > 0) {
        const columns = compositeResult.rows
          .map(r => `  ${r.column_name} ${r.column_type}`)
          .join(',\n');
        ddl = `CREATE TYPE ${row.type_name} AS (\n${columns}\n);`;
      }
    } else if (row.type_category === 'domain') {
      // DOMAIN型の詳細を取得
      const domainResult = await client.query(`
        SELECT 
          pg_catalog.format_type(t.typbasetype, t.typtypmod) as base_type,
          t.typnotnull,
          t.typdefault,
          (SELECT string_agg(pg_get_constraintdef(c.oid), ' AND ')
           FROM pg_constraint c
           WHERE c.contypid = t.oid) as constraints
        FROM pg_type t
        WHERE t.typname = $1 
          AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2)
          AND t.typtype = 'd'
      `, [row.type_name, row.schema_name]);
      
      if (domainResult.rows.length > 0) {
        const domain = domainResult.rows[0];
        ddl = `CREATE DOMAIN ${row.type_name} AS ${domain.base_type}`;
        
        if (domain.typdefault) {
          ddl += ` DEFAULT ${domain.typdefault}`;
        }
        
        if (domain.typnotnull) {
          ddl += ` NOT NULL`;
        }
        
        if (domain.constraints) {
          ddl += ` CHECK (${domain.constraints})`;
        }
        
        ddl += ';';
      }
    }
    
    if (ddl) {
      // 型コメントを先頭に追加
      let finalDdl = '';
      if (!row.comment) {
        finalDdl += `-- Type: ${row.type_name}\n`;
      } else {
        finalDdl += `-- ${row.comment}\n`;
      }
      
      // 型定義を追加
      finalDdl += ddl + '\n\n';
      
      // COMMENT ON文を追加
      if (!row.comment) {
        finalDdl += `-- COMMENT ON TYPE ${row.schema_name}.${row.type_name} IS '_your_comment_here_';\n\n`;
      } else {
        finalDdl += `COMMENT ON TYPE ${row.schema_name}.${row.type_name} IS '${row.comment}';\n\n`;
      }
      
      types.push({
        name: `${row.schema_name}_${row.type_name}`,
        type: 'type',
        ddl: finalDdl,
        comment: row.comment,
        timestamp: Math.floor(Date.now() / 1000)
      });
    }
  }
  
  return types;
}

/**
 * データベースからテーブル定義を取得
 */
async function fetchTableDefinitions(client: Client, spinner?: any, progress?: ProgressTracker, schemas: string[] = ['public']): Promise<TableDefinition[]> {
  const definitions: TableDefinition[] = [];

  const schemaPlaceholders = schemas.map((_, index) => `$${index + 1}`).join(', ');
  
  // テーブル一覧を取得
  const tablesResult = await client.query(`
    SELECT tablename, schemaname, 'table' as type
    FROM pg_tables 
    WHERE schemaname IN (${schemaPlaceholders})
    ORDER BY schemaname, tablename
  `, schemas);

  // ビュー一覧を取得
  const viewsResult = await client.query(`
    SELECT viewname as tablename, schemaname, 'view' as type
    FROM pg_views 
    WHERE schemaname IN (${schemaPlaceholders})
    ORDER BY schemaname, viewname
  `, schemas);

  const allObjects = [...tablesResult.rows, ...viewsResult.rows];
  const tableCount = tablesResult.rows.length;
  const viewCount = viewsResult.rows.length;

  // 進行状況の初期化
  if (progress) {
    progress.tables.total = tableCount;
    progress.views.total = viewCount;
  }

  // 制限付き並行処理でテーブル/ビューを処理（接続数を制限）
  // 環境変数で最大値を設定可能（デフォルト20、最大50）
  const envValue = process.env.SUPATOOL_MAX_CONCURRENT || '20';
  const MAX_CONCURRENT = Math.min(50, parseInt(envValue));
  // 環境変数で設定された値を使用（最小5でキャップ）
  const CONCURRENT_LIMIT = Math.max(5, MAX_CONCURRENT);
  
  // デバッグログ（開発時のみ）
  if (process.env.NODE_ENV === 'development' || process.env.SUPATOOL_DEBUG) {
    console.log(`Processing ${allObjects.length} objects with ${CONCURRENT_LIMIT} concurrent operations`);
  }
  
  // テーブル/ビュー処理のPromise生成関数
  const processObject = async (obj: any, index: number) => {
    const isTable = obj.type === 'table';
    const name = obj.tablename;
    const schemaName = obj.schemaname;
    const type = obj.type as 'table' | 'view';

    let ddl = '';
    let comment = '';
    let timestamp = Math.floor(new Date('2020-01-01').getTime() / 1000);

    if (type === 'table') {
      // テーブルの場合
      try {
        // テーブルの最終更新時刻を取得
        const tableStatsResult = await client.query(`
          SELECT 
            EXTRACT(EPOCH FROM GREATEST(
              COALESCE(last_vacuum, '1970-01-01'::timestamp),
              COALESCE(last_autovacuum, '1970-01-01'::timestamp),
              COALESCE(last_analyze, '1970-01-01'::timestamp),
              COALESCE(last_autoanalyze, '1970-01-01'::timestamp)
            ))::bigint as last_updated
          FROM pg_stat_user_tables 
          WHERE relname = $1 AND schemaname = $2
        `, [name, schemaName]);

        if (tableStatsResult.rows.length > 0 && tableStatsResult.rows[0].last_updated > 0) {
          timestamp = tableStatsResult.rows[0].last_updated;
        }
      } catch (error) {
        // エラーの場合はデフォルトタイムスタンプを使用
      }

      // CREATE TABLE文を生成
      ddl = await generateCreateTableDDL(client, name, schemaName);
      
      // テーブルコメントを取得
      try {
        const tableCommentResult = await client.query(`
          SELECT obj_description(c.oid) as table_comment
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE c.relname = $1 AND n.nspname = $2 AND c.relkind = 'r'
        `, [name, schemaName]);
        
        if (tableCommentResult.rows.length > 0 && tableCommentResult.rows[0].table_comment) {
          comment = tableCommentResult.rows[0].table_comment;
        }
      } catch (error) {
        // エラーの場合はコメントなし
      }
    } else {
      // ビューの場合
      try {
        // ビューの定義とsecurity_invoker設定を取得
        const viewResult = await client.query(`
          SELECT 
            pv.definition,
            c.relname,
            c.reloptions
          FROM pg_views pv
          JOIN pg_class c ON c.relname = pv.viewname
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE pv.schemaname = $1 
            AND pv.viewname = $2
            AND n.nspname = $1
            AND c.relkind = 'v'
        `, [schemaName, name]);

        if (viewResult.rows.length > 0) {
          const view = viewResult.rows[0];
          
          // ビューのコメントを取得
          const viewCommentResult = await client.query(`
            SELECT obj_description(c.oid) as view_comment
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = $1 AND n.nspname = $2 AND c.relkind = 'v'
          `, [name, schemaName]);

          // ビューコメントを先頭に追加
          if (viewCommentResult.rows.length > 0 && viewCommentResult.rows[0].view_comment) {
            comment = viewCommentResult.rows[0].view_comment;
            ddl = `-- ${comment}\n`;
          } else {
            ddl = `-- View: ${name}\n`;
          }

          // ビュー定義を追加
          let ddlStart = `CREATE OR REPLACE VIEW ${name}`;
          
          // security_invoker設定をチェック
          if (view.reloptions) {
            for (const option of view.reloptions) {
              if (option.startsWith('security_invoker=')) {
                const value = option.split('=')[1];
                if (value === 'on' || value === 'true') {
                  ddlStart += ' WITH (security_invoker = on)';
                } else if (value === 'off' || value === 'false') {
                  ddlStart += ' WITH (security_invoker = off)';
                }
                break;
              }
            }
          }
          
          ddl += ddlStart + ' AS\n' + view.definition + ';\n\n';
          
          // COMMENT ON文を追加
          if (viewCommentResult.rows.length > 0 && viewCommentResult.rows[0].view_comment) {
            ddl += `COMMENT ON VIEW ${schemaName}.${name} IS '${comment}';\n\n`;
          } else {
            ddl += `-- COMMENT ON VIEW ${schemaName}.${name} IS '_your_comment_here_';\n\n`;
          }

          // ビューの作成時刻を取得（可能であれば）
          try {
            const viewStatsResult = await client.query(`
              SELECT EXTRACT(EPOCH FROM GREATEST(
                COALESCE(pg_stat_get_last_vacuum_time(c.oid), '1970-01-01'::timestamp),
                COALESCE(pg_stat_get_last_analyze_time(c.oid), '1970-01-01'::timestamp)
              ))::bigint as last_updated
              FROM pg_class c
              JOIN pg_namespace n ON c.relnamespace = n.oid
              WHERE c.relname = $1 AND n.nspname = $2 AND c.relkind = 'v'
            `, [name, schemaName]);

            if (viewStatsResult.rows.length > 0 && viewStatsResult.rows[0].last_updated > 0) {
              timestamp = viewStatsResult.rows[0].last_updated;
            }
          } catch (error) {
            // エラーの場合はデフォルトタイムスタンプを使用
          }
        }
      } catch (error) {
        // エラーの場合はコメントなし
      }
    }

    return {
      name: schemaName === 'public' ? name : `${schemaName}_${name}`,
      type,
      ddl,
      timestamp,
      comment: comment || undefined,
      isTable
    };
  };

  // シンプルなバッチ並行処理（確実な進行状況更新）
  const processedResults: (TableDefinition | null)[] = [];
  
  for (let i = 0; i < allObjects.length; i += CONCURRENT_LIMIT) {
    const batch = allObjects.slice(i, i + CONCURRENT_LIMIT);
    
         // バッチを並行処理
     const batchPromises = batch.map(async (obj, batchIndex) => {
       try {
         const globalIndex = i + batchIndex;
         
         // デバッグ: 処理開始
         if (process.env.SUPATOOL_DEBUG) {
           console.log(`Starting ${obj.type} ${obj.tablename} (${globalIndex + 1}/${allObjects.length})`);
         }
         
         const result = await processObject(obj, globalIndex);
         
         // デバッグ: 処理完了
         if (process.env.SUPATOOL_DEBUG) {
           console.log(`Completed ${obj.type} ${obj.tablename} (${globalIndex + 1}/${allObjects.length})`);
         }
         
         // 個別完了時に即座に進行状況を更新
         if (result && progress && spinner) {
           if (result.isTable) {
             progress.tables.current = Math.min(progress.tables.current + 1, progress.tables.total);
           } else {
             progress.views.current = Math.min(progress.views.current + 1, progress.views.total);
           }
           displayProgress(progress, spinner);
         }
         
         return result;
       } catch (error) {
         console.error(`Error processing ${obj.type} ${obj.tablename}:`, error);
         return null;
       }
     });
    
    // バッチの完了を待機
    const batchResults = await Promise.all(batchPromises);
    processedResults.push(...batchResults);
  }

  // null値を除外してdefinitionsに追加
  for (const result of processedResults) {
    if (result) {
      const { isTable, ...definition } = result as any;
      definitions.push(definition);
    }
  }

  return definitions;
}

/**
 * CREATE TABLE DDLを生成（並行処理版）
 */
async function generateCreateTableDDL(client: Client, tableName: string, schemaName: string = 'public'): Promise<string> {
  // 全てのクエリを並行実行
  const [
    columnsResult,
    primaryKeyResult,
    tableCommentResult,
    columnCommentsResult,
    uniqueConstraintResult,
    foreignKeyResult
  ] = await Promise.all([
    // カラム情報を取得
    client.query(`
      SELECT 
        c.column_name,
        c.data_type,
        c.udt_name,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS full_type
      FROM information_schema.columns c
      JOIN pg_class cl ON cl.relname = c.table_name
      JOIN pg_namespace ns ON ns.nspname = c.table_schema AND ns.oid = cl.relnamespace
      JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attname = c.column_name
      WHERE c.table_schema = $1 
        AND c.table_name = $2
      ORDER BY c.ordinal_position
    `, [schemaName, tableName]),
    
    // 主キー情報を取得
    client.query(`
      SELECT column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = $1
        AND tc.table_name = $2
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `, [schemaName, tableName]),
    
    // テーブルコメントを取得
    client.query(`
      SELECT obj_description(c.oid) as table_comment
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = $1 AND n.nspname = $2 AND c.relkind = 'r'
    `, [tableName, schemaName]),
    
    // カラムコメントを取得
    client.query(`
      SELECT 
        c.column_name,
        pgd.description as column_comment
      FROM information_schema.columns c
      LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
      LEFT JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace
      LEFT JOIN pg_attribute pga ON pga.attrelid = pgc.oid AND pga.attname = c.column_name
      LEFT JOIN pg_description pgd ON pgd.objoid = pgc.oid AND pgd.objsubid = pga.attnum
      WHERE c.table_schema = $1 AND c.table_name = $2
        AND pgn.nspname = $1
      ORDER BY c.ordinal_position
    `, [schemaName, tableName]),
    
    // UNIQUE制約を取得
    client.query(`
      SELECT 
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = $1
        AND tc.table_name = $2
        AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name
      ORDER BY tc.constraint_name
    `, [schemaName, tableName]),
    
    // FOREIGN KEY制約を取得
    client.query(`
      SELECT 
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        string_agg(ccu.column_name, ', ' ORDER BY kcu.ordinal_position) as foreign_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = $1
        AND tc.table_name = $2
        AND tc.constraint_type = 'FOREIGN KEY'
      GROUP BY tc.constraint_name, ccu.table_schema, ccu.table_name
      ORDER BY tc.constraint_name
    `, [schemaName, tableName])
  ]);

  const columnComments = new Map();
  columnCommentsResult.rows.forEach(row => {
    if (row.column_comment) {
      columnComments.set(row.column_name, row.column_comment);
    }
  });

  // テーブルコメントを先頭に追加（スキーマ名を含む）
  let ddl = '';
  
  // テーブルコメントを先頭に追加
  if (tableCommentResult.rows.length > 0 && tableCommentResult.rows[0].table_comment) {
    ddl += `-- ${tableCommentResult.rows[0].table_comment}\n`;
  } else {
    ddl += `-- Table: ${tableName}\n`;
  }
  
  // CREATE TABLE文を生成
  ddl += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
  const columnDefs: string[] = [];
  for (const col of columnsResult.rows) {
    const rawType: string = col.full_type ||
      ((col.data_type === 'USER-DEFINED' && col.udt_name) ? col.udt_name : col.data_type);
    let colDef = `  ${col.column_name} ${rawType}`;
    
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

  // UNIQUE制約をCREATE TABLE内に追加
  for (const unique of uniqueConstraintResult.rows) {
    ddl += `,\n  CONSTRAINT ${unique.constraint_name} UNIQUE (${unique.columns})`;
  }

  // FOREIGN KEY制約をCREATE TABLE内に追加
  for (const fk of foreignKeyResult.rows) {
    ddl += `,\n  CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.columns}) REFERENCES ${fk.foreign_table_schema}.${fk.foreign_table_name} (${fk.foreign_columns})`;
  }
  
  ddl += '\n);\n\n';

  // COMMENT ON文を追加
  if (tableCommentResult.rows.length > 0 && tableCommentResult.rows[0].table_comment) {
    ddl += `COMMENT ON TABLE ${schemaName}.${tableName} IS '${tableCommentResult.rows[0].table_comment}';\n\n`;
  } else {
    ddl += `-- COMMENT ON TABLE ${schemaName}.${tableName} IS '_your_comment_here_';\n\n`;
  }

  // カラムコメントを追加（スキーマ名を含む）
  if (columnComments.size > 0) {
    ddl += '\n-- カラムコメント\n';
    for (const [columnName, comment] of columnComments) {
      ddl += `COMMENT ON COLUMN ${schemaName}.${tableName}.${columnName} IS '${comment}';\n`;
    }
  }

  return ddl;
}

/**
 * 定義をファイルに保存
 */
async function saveDefinitionsByType(definitions: TableDefinition[], outputDir: string, separateDirectories: boolean = true): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  // 出力ディレクトリを作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 各タイプのディレクトリマッピング
  const typeDirectories = separateDirectories ? {
    table: path.join(outputDir, 'tables'), // テーブルもtables/フォルダに
    view: path.join(outputDir, 'views'),
    rls: path.join(outputDir, 'rls'),
    function: path.join(outputDir, 'rpc'),
    trigger: path.join(outputDir, 'rpc'), // トリガーもrpcディレクトリに
    cron: path.join(outputDir, 'cron'),
    type: path.join(outputDir, 'types')
  } : {
    // --no-separate の場合は全てルートに
    table: outputDir,
    view: outputDir,
    rls: outputDir,
    function: outputDir,
    trigger: outputDir,
    cron: outputDir,
    type: outputDir
  };

  // 必要なディレクトリを事前作成
  const requiredDirs = new Set(Object.values(typeDirectories));
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 並行ファイル書き込み
  const writePromises = definitions.map(async (def) => {
    const targetDir = typeDirectories[def.type];

    // ファイル名を決定（TypeとTriggerを区別しやすくする）
    let fileName: string;
    if (def.type === 'function') {
      fileName = `fn_${def.name}.sql`;
    } else if (def.type === 'trigger') {
      fileName = `trg_${def.name}.sql`;
    } else {
      fileName = `${def.name}.sql`;
    }
    
    const filePath = path.join(targetDir, fileName);
    // 最後に改行を追加
    const ddlWithNewline = def.ddl.endsWith('\n') ? def.ddl : def.ddl + '\n';
    
    // 非同期でファイル書き込み
    const fsPromises = await import('fs/promises');
    await fsPromises.writeFile(filePath, ddlWithNewline);
  });

  // 全ファイル書き込みの完了を待機
  await Promise.all(writePromises);

  // インデックスファイルを生成
  await generateIndexFile(definitions, outputDir, separateDirectories);
}

/**
 * データベースオブジェクトのインデックスファイルを生成
 * AIが構造を理解しやすいように1行ずつリストアップ
 */
async function generateIndexFile(definitions: TableDefinition[], outputDir: string, separateDirectories: boolean = true): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  // タイプ別にグループ化
  const groupedDefs = {
    table: definitions.filter(def => def.type === 'table'),
    view: definitions.filter(def => def.type === 'view'),
    rls: definitions.filter(def => def.type === 'rls'),
    function: definitions.filter(def => def.type === 'function'),
    trigger: definitions.filter(def => def.type === 'trigger'),
    cron: definitions.filter(def => def.type === 'cron'),
    type: definitions.filter(def => def.type === 'type')
  };

  const typeLabels = {
    table: 'Tables',
    view: 'Views', 
    rls: 'RLS Policies',
    function: 'Functions',
    trigger: 'Triggers',
    cron: 'Cron Jobs',
    type: 'Custom Types'
  };

  // === 人間向け index.md ===
  let indexContent = '# Database Schema Index\n\n';
  
  // 統計サマリー
  indexContent += '## Summary\n\n';
  Object.entries(groupedDefs).forEach(([type, defs]) => {
    if (defs.length > 0) {
      indexContent += `- ${typeLabels[type as keyof typeof typeLabels]}: ${defs.length} objects\n`;
    }
  });
  indexContent += '\n';

  // ファイル一覧（md形式）
  Object.entries(groupedDefs).forEach(([type, defs]) => {
    if (defs.length === 0) return;
    
    const label = typeLabels[type as keyof typeof typeLabels];
    indexContent += `## ${label}\n\n`;
    
    defs.forEach(def => {
      const folderPath = separateDirectories 
        ? (type === 'trigger' ? 'rpc' : type === 'table' ? 'tables' : type)
        : '.';
      
      // ファイル名を決定（Functions/Triggersに接頭辞を付ける）
      let fileName: string;
      if (def.type === 'function') {
        fileName = `fn_${def.name}.sql`;
      } else if (def.type === 'trigger') {
        fileName = `trg_${def.name}.sql`;
      } else {
        fileName = `${def.name}.sql`;
      }
      
      const filePath = separateDirectories ? `${folderPath}/${fileName}` : fileName;
      const commentText = def.comment ? ` - ${def.comment}` : '';
      indexContent += `- [${def.name}](${filePath})${commentText}\n`;
    });
    indexContent += '\n';
  });

  // ディレクトリ構造（フォルダのみ）
  indexContent += '## Directory Structure\n\n';
  indexContent += '```\n';
  indexContent += 'schemas/\n';
  indexContent += '├── index.md\n';
  indexContent += '├── llms.txt\n';
  
  if (separateDirectories) {
    Object.entries(groupedDefs).forEach(([type, defs]) => {
      if (defs.length === 0) return;
      const folderName = type === 'trigger' ? 'rpc' : type === 'table' ? 'tables' : type;
      indexContent += `└── ${folderName}/\n`;
    });
  }
  indexContent += '```\n';

  // === AI向け llms.txt ===
  let llmsContent = 'Database Schema - Complete Objects Catalog\n\n';
  
  // Summary section
  llmsContent += 'SUMMARY\n';
  Object.entries(groupedDefs).forEach(([type, defs]) => {
    if (defs.length > 0) {
      llmsContent += `${typeLabels[type as keyof typeof typeLabels]}: ${defs.length}\n`;
    }
  });
  llmsContent += '\n';

  // Flat list for AI processing (single format)
  llmsContent += 'OBJECTS\n';
  definitions.forEach(def => {
    const folderPath = separateDirectories 
      ? (def.type === 'trigger' ? 'rpc' : def.type === 'table' ? 'tables' : def.type)
      : '.';
    
    // ファイル名を決定（Functions/Triggersに接頭辞を付ける）
    let fileName: string;
    if (def.type === 'function') {
      fileName = `fn_${def.name}.sql`;
    } else if (def.type === 'trigger') {
      fileName = `trg_${def.name}.sql`;
    } else {
      fileName = `${def.name}.sql`;
    }
    
    const filePath = separateDirectories ? `${folderPath}/${fileName}` : fileName;
    const commentText = def.comment ? `:${def.comment}` : '';
    llmsContent += `${def.type}:${def.name}:${filePath}${commentText}\n`;
  });

  // ファイル保存
  const indexPath = path.join(outputDir, 'index.md');
  const llmsPath = path.join(outputDir, 'llms.txt');
  
  fs.writeFileSync(indexPath, indexContent);
  fs.writeFileSync(llmsPath, llmsContent);
}

/**
 * 定義を分類して出力
 */
export async function extractDefinitions(options: DefinitionExtractOptions): Promise<void> {
  const { 
    connectionString, 
    outputDir, 
    separateDirectories = true, 
    tablesOnly = false, 
    viewsOnly = false,
    all = false,
    tablePattern = '*',
    force = false,
    schemas = ['public']
  } = options;

  // Node.jsのSSL証明書検証を無効化
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // 接続文字列の検証
  if (!connectionString) {
    throw new Error('接続文字列が設定されていません。以下のいずれかで設定してください:\n' +
      '1. --connection オプション\n' +
      '2. SUPABASE_CONNECTION_STRING 環境変数\n' +
      '3. DATABASE_URL 環境変数\n' +
      '4. supatool.config.json 設定ファイル');
  }

  // 接続文字列の形式検証
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error(`不正な接続文字列形式です: ${connectionString}\n` +
      '正しい形式: postgresql://username:password@host:port/database');
  }

  // パスワード部分をURLエンコード
  let encodedConnectionString = connectionString;
  console.log('🔍 元の接続文字列:', connectionString);
  
  try {
    // パスワードに@が含まれる場合の特別処理
    if (connectionString.includes('@') && connectionString.split('@').length > 2) {
      console.log('⚠️ パスワードに@が含まれているため特別処理を実行');
      // 最後の@を区切り文字として使用
      const parts = connectionString.split('@');
      const lastPart = parts.pop(); // 最後の部分（host:port/database）
      const firstParts = parts.join('@'); // 最初の部分（postgresql://user:password）
      
      console.log('   分割結果:');
      console.log('   前半部分:', firstParts);
      console.log('   後半部分:', lastPart);
      
      // パスワード部分をエンコード
      const colonIndex = firstParts.lastIndexOf(':');
      if (colonIndex > 0) {
        const protocolAndUser = firstParts.substring(0, colonIndex);
        const password = firstParts.substring(colonIndex + 1);
        const encodedPassword = encodeURIComponent(password);
        encodedConnectionString = `${protocolAndUser}:${encodedPassword}@${lastPart}`;
        
        console.log('   エンコード結果:');
        console.log('   プロトコル+ユーザー:', protocolAndUser);
        console.log('   元パスワード:', password);
        console.log('   エンコードパスワード:', encodedPassword);
        console.log('   最終接続文字列:', encodedConnectionString);
      }
    } else {
      console.log('✅ 通常のURL解析を実行');
      // 通常のURL解析
      const url = new URL(connectionString);
      
      // ユーザー名にドットが含まれる場合の処理
      if (url.username && url.username.includes('.')) {
        console.log(`ユーザー名（ドット含む）: ${url.username}`);
      }
      
      if (url.password) {
        // パスワード部分のみをエンコード
        const encodedPassword = encodeURIComponent(url.password);
        url.password = encodedPassword;
        encodedConnectionString = url.toString();
        console.log('   パスワードエンコード:', encodedPassword);
      }
    }
    
    // Supabase接続用にSSL設定を追加
    if (!encodedConnectionString.includes('sslmode=')) {
      const separator = encodedConnectionString.includes('?') ? '&' : '?';
      encodedConnectionString += `${separator}sslmode=require`;
      console.log('   SSL設定を追加:', encodedConnectionString);
    }
    
    // デバッグ情報を表示（パスワードは隠す）
    const debugUrl = new URL(encodedConnectionString);
    const maskedPassword = debugUrl.password ? '*'.repeat(debugUrl.password.length) : '';
    debugUrl.password = maskedPassword;
    console.log('🔍 接続情報:');
    console.log(`   ホスト: ${debugUrl.hostname}`);
    console.log(`   ポート: ${debugUrl.port}`);
    console.log(`   データベース: ${debugUrl.pathname.slice(1)}`);
    console.log(`   ユーザー: ${debugUrl.username}`);
    console.log(`   SSL: ${debugUrl.searchParams.get('sslmode') || 'require'}`);
  } catch (error) {
    // URL解析に失敗した場合は元の文字列を使用
    console.warn('接続文字列のURL解析に失敗しました。特殊文字が含まれている可能性があります。');
    console.warn('エラー詳細:', error instanceof Error ? error.message : String(error));
  }

  const fs = await import('fs');
  const readline = await import('readline');

  // 上書き確認
  if (!force && fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    if (files.length > 0) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(`Directory "${outputDir}" already exists and contains files. Overwrite? (y/N): `, resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        return;
      }
    }
  }

  // スピナーを動的インポート
  const { default: ora } = await import('ora');
  const spinner = ora('Connecting to database...').start();

  const client = new Client({ 
    connectionString: encodedConnectionString,
    ssl: {
      rejectUnauthorized: false,
      ca: undefined
    }
  });
  
  try {
    // 接続前のデバッグ情報
    console.log('🔧 接続設定:');
    console.log(`   SSL: rejectUnauthorized=false`);
    console.log(`   接続文字列長: ${encodedConnectionString.length}`);
    
    await client.connect();
    spinner.text = 'Connected to database';

    let allDefinitions: TableDefinition[] = [];

    // 進行状況トラッカーを初期化
    const progress: ProgressTracker = {
      tables: { current: 0, total: 0 },
      views: { current: 0, total: 0 },
      rls: { current: 0, total: 0 },
      functions: { current: 0, total: 0 },
      triggers: { current: 0, total: 0 },
      cronJobs: { current: 0, total: 0 },
      customTypes: { current: 0, total: 0 }
    };

    if (all) {
      // 事前に各オブジェクトの総数を取得
      spinner.text = 'Counting database objects...';
      
      // テーブル・ビューの総数を取得
      const tablesCountResult = await client.query('SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = \'public\'');
      const viewsCountResult = await client.query('SELECT COUNT(*) as count FROM pg_views WHERE schemaname = \'public\'');
      progress.tables.total = parseInt(tablesCountResult.rows[0].count);
      progress.views.total = parseInt(viewsCountResult.rows[0].count);
      
      // RLS ポリシーの総数を取得（テーブル単位）
      try {
        const rlsCountResult = await client.query(`
          SELECT COUNT(DISTINCT tablename) as count 
          FROM pg_policies 
          WHERE schemaname = 'public'
        `);
        progress.rls.total = parseInt(rlsCountResult.rows[0].count);
      } catch (error) {
        progress.rls.total = 0;
      }
      
      // 関数の総数を取得
      const functionsCountResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
      `);
      progress.functions.total = parseInt(functionsCountResult.rows[0].count);
      
      // トリガーの総数を取得
      const triggersCountResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
      `);
      progress.triggers.total = parseInt(triggersCountResult.rows[0].count);
      
      // Cronジョブの総数を取得
      try {
        const cronCountResult = await client.query('SELECT COUNT(*) as count FROM cron.job');
        progress.cronJobs.total = parseInt(cronCountResult.rows[0].count);
      } catch (error) {
        progress.cronJobs.total = 0;
      }
      
      // カスタム型の総数を取得
      const typesCountResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.typtype IN ('e', 'c', 'd')
          AND NOT EXISTS (
            SELECT 1 FROM pg_class c 
            WHERE c.relname = t.typname 
              AND c.relnamespace = n.oid
              AND c.relkind IN ('r', 'v', 'i', 'S', 'c')
          )
          AND t.typname NOT LIKE 'pg_%'
          AND t.typname NOT LIKE '_%'
      `);
      progress.customTypes.total = parseInt(typesCountResult.rows[0].count);

      // --all フラグが指定された場合は全てのオブジェクトを取得（順次処理）
      const tables = await fetchTableDefinitions(client, spinner, progress, schemas);
      const rlsPolicies = await fetchRlsPolicies(client, spinner, progress, schemas);
      const functions = await fetchFunctions(client, spinner, progress, schemas);
      const triggers = await fetchTriggers(client, spinner, progress, schemas);
      const cronJobs = await fetchCronJobs(client, spinner, progress);
      const customTypes = await fetchCustomTypes(client, spinner, progress, schemas);
      
      allDefinitions = [
        ...tables,
        ...rlsPolicies,
        ...functions,
        ...triggers,
        ...cronJobs,
        ...customTypes
      ];
    } else {
      // 従来の処理（テーブル・ビューのみ）
      // テーブル・ビューの総数を取得
      const tablesCountResult = await client.query('SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = \'public\'');
      const viewsCountResult = await client.query('SELECT COUNT(*) as count FROM pg_views WHERE schemaname = \'public\'');
      progress.tables.total = parseInt(tablesCountResult.rows[0].count);
      progress.views.total = parseInt(viewsCountResult.rows[0].count);
      
      const definitions = await fetchTableDefinitions(client, spinner, progress, schemas);
      
      if (tablesOnly) {
        allDefinitions = definitions.filter(def => def.type === 'table');
      } else if (viewsOnly) {
        allDefinitions = definitions.filter(def => def.type === 'view');
      } else {
        allDefinitions = definitions;
      }
    }
    
    // パターンマッチング
    if (tablePattern !== '*') {
      const regex = new RegExp(tablePattern.replace(/\*/g, '.*'));
      allDefinitions = allDefinitions.filter(def => regex.test(def.name));
    }

    // 定義を保存
    spinner.text = 'Saving definitions to files...';
    await saveDefinitionsByType(allDefinitions, outputDir, separateDirectories);

    // 統計を表示
    const counts = {
      table: allDefinitions.filter(def => def.type === 'table').length,
      view: allDefinitions.filter(def => def.type === 'view').length,
      rls: allDefinitions.filter(def => def.type === 'rls').length,
      function: allDefinitions.filter(def => def.type === 'function').length,
      trigger: allDefinitions.filter(def => def.type === 'trigger').length,
      cron: allDefinitions.filter(def => def.type === 'cron').length,
      type: allDefinitions.filter(def => def.type === 'type').length
    };

    // 進捗表示を停止
    stopProgressDisplay();
    
    spinner.succeed(`Extraction completed: ${outputDir}`);
    if (counts.table > 0) console.log(`   Tables: ${counts.table}`);
    if (counts.view > 0) console.log(`   Views: ${counts.view}`);
    if (counts.rls > 0) console.log(`   RLS Policies: ${counts.rls}`);
    if (counts.function > 0) console.log(`   Functions: ${counts.function}`);
    if (counts.trigger > 0) console.log(`   Triggers: ${counts.trigger}`);
    if (counts.cron > 0) console.log(`   Cron Jobs: ${counts.cron}`);
    if (counts.type > 0) console.log(`   Custom Types: ${counts.type}`);
    console.log('');

  } catch (error) {
    // 進捗表示を停止（エラー時）
    stopProgressDisplay();
    spinner.fail('Extraction failed');
    console.error('Error:', error);
    throw error;
  } finally {
    try {
      await client.end();
    } catch (closeError) {
      // データベース接続の終了エラーは無視（既に切断されている場合など）
    }
  }
}