import { Client } from 'pg';

export interface TableDefinition {
  name: string;
  type: 'table' | 'view' | 'rls' | 'function' | 'trigger' | 'cron' | 'type';
  ddl: string;
  timestamp: number;
  category?: string; // table or object name (e.g. schema.table)
  comment?: string; // comment
  schema?: string;  // schema name (for output path and merge grouping)
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
  schemas?: string[]; // target schemas (default: ['public'])
  version?: string;   // for output header (supatool version)
}

/** Single FK relation (for llms.txt RELATIONS) */
export interface SchemaRelation {
  from: string; // schema.table
  to: string;   // schema.table
}

/** Tables referenced by an RPC (for llms.txt RPC_TABLES) */
export interface RpcTableUsage {
  rpc: string;   // schema.fn_name
  tables: string[]; // schema.table[]
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
 * Display progress
 */
// Store global progress state
let globalProgress: ProgressTracker | null = null;
let progressUpdateInterval: NodeJS.Timeout | null = null;

function displayProgress(progress: ProgressTracker, spinner: any) {
  // Update global state
  globalProgress = progress;
  
  // Start periodic update if not already
  if (!progressUpdateInterval) {
    progressUpdateInterval = setInterval(() => {
      if (globalProgress && spinner) {
        updateSpinnerDisplay(globalProgress, spinner);
      }
    }, 80); // Update every 80ms
  }
  
  // Update display immediately
  updateSpinnerDisplay(progress, spinner);
}

function updateSpinnerDisplay(progress: ProgressTracker, spinner: any) {
  // Compute overall progress
  const totalObjects = progress.tables.total + progress.views.total + progress.rls.total + 
                      progress.functions.total + progress.triggers.total + progress.cronJobs.total + 
                      progress.customTypes.total;
  const completedObjects = progress.tables.current + progress.views.current + progress.rls.current + 
                          progress.functions.current + progress.triggers.current + progress.cronJobs.current + 
                          progress.customTypes.current;

  // Build progress bar
  const createProgressBar = (current: number, total: number, width: number = 20) => {
    if (total === 0) return '░'.repeat(width);
    
    const percentage = Math.min(current / total, 1);
    const filled = Math.floor(percentage * width);
    const empty = width - filled;
    
    return '⚡'.repeat(filled) + '░'.repeat(empty);
  };

  // Show overall bar only (fit to console width)
  const overallBar = createProgressBar(completedObjects, totalObjects, 20);
  const overallPercent = totalObjects > 0 ? Math.floor((completedObjects / totalObjects) * 100) : 0;
  
  // Green rotating spinner
  const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const spinnerFrame = Math.floor((Date.now() / 80) % spinnerFrames.length);
  const greenSpinner = `\x1b[32m${spinnerFrames[spinnerFrame]}\x1b[0m`;
  
  // Dot animation
  const dotFrames = ["", ".", "..", "..."];
  const dotFrame = Math.floor((Date.now() / 400) % dotFrames.length);
  
  const statusMessage = "Extracting";
  
  const display = `\r${greenSpinner} [${overallBar}] ${overallPercent}% (${completedObjects}/${totalObjects}) ${statusMessage}${dotFrames[dotFrame]}`;
  
  spinner.text = display;
}

// Stop progress display
function stopProgressDisplay() {
  if (progressUpdateInterval) {
    clearInterval(progressUpdateInterval);
    progressUpdateInterval = null;
  }
  globalProgress = null;
}

/**
 * Fetch RLS policies
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
  
  // Initialize progress
  if (progress) {
    progress.rls.total = tableKeys.length;
  }
  
  for (let i = 0; i < tableKeys.length; i++) {
    const tableKey = tableKeys[i];
    const tablePolicies = groupedPolicies[tableKey];
    const firstPolicy = tablePolicies[0];
    const schemaName = firstPolicy.schemaname;
    const tableName = firstPolicy.tablename;
    
    // Update progress
    if (progress && spinner) {
      progress.rls.current = i + 1;
      displayProgress(progress, spinner);
    }
    // Add RLS policy description at top
    let ddl = `-- RLS Policies for ${schemaName}.${tableName}\n`;
    ddl += `-- Row Level Security policies to control data access at the row level\n\n`;
    
    ddl += `ALTER TABLE ${schemaName}.${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
    
    for (const policy of tablePolicies) {
      ddl += `CREATE POLICY ${policy.policyname}\n`;
      ddl += `  ON ${schemaName}.${tableName}\n`;
      ddl += `  AS ${policy.permissive || 'PERMISSIVE'}\n`;
      ddl += `  FOR ${policy.cmd || 'ALL'}\n`;
      
      if (policy.roles) {
        // Handle roles as array or string
        let roles: string;
        if (Array.isArray(policy.roles)) {
          roles = policy.roles.join(', ');
        } else {
          // Handle PostgreSQL array literal "{role1,role2}" or plain string
          roles = String(policy.roles)
            .replace(/[{}]/g, '') // Remove braces
            .replace(/"/g, ''); // Remove double quotes
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
      schema: schemaName,
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

/** Per-table RLS enabled/disabled and policy count (for Tables docs and warnings) */
export interface TableRlsStatus {
  schema: string;
  table: string;
  rlsEnabled: boolean;
  policyCount: number;
}

/**
 * Fetch RLS enabled flag and policy count for all tables (pg_class.relrowsecurity + pg_policies)
 */
async function fetchTableRlsStatus(client: Client, schemas: string[] = ['public']): Promise<TableRlsStatus[]> {
  if (schemas.length === 0) return [];
  const schemaPlaceholders = schemas.map((_, i) => `$${i + 1}`).join(', ');
  const result = await client.query(`
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      COALESCE(c.relrowsecurity, false) AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN (${schemaPlaceholders})
    ORDER BY n.nspname, c.relname
  `, schemas);

  const policyCountMap = new Map<string, number>();
  const policyResult = await client.query(`
    SELECT schemaname, tablename, COUNT(*) AS cnt
    FROM pg_policies
    WHERE schemaname IN (${schemaPlaceholders})
    GROUP BY schemaname, tablename
  `, schemas);
  for (const row of policyResult.rows as any[]) {
    policyCountMap.set(`${row.schemaname}.${row.tablename}`, parseInt(row.cnt, 10));
  }

  return result.rows.map((r: any) => {
    const key = `${r.schema_name}.${r.table_name}`;
    return {
      schema: r.schema_name,
      table: r.table_name,
      rlsEnabled: !!r.rls_enabled,
      policyCount: policyCountMap.get(key) ?? 0
    };
  });
}

/**
 * Fetch FK relations list (for llms.txt RELATIONS)
 */
async function fetchRelationList(client: Client, schemas: string[] = ['public']): Promise<SchemaRelation[]> {
  if (schemas.length === 0) return [];
  const schemaPlaceholders = schemas.map((_, i) => `$${i + 1}`).join(', ');
  const result = await client.query(`
    SELECT
      tc.table_schema AS from_schema,
      tc.table_name AS from_table,
      ccu.table_schema AS to_schema,
      ccu.table_name AS to_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema IN (${schemaPlaceholders})
    ORDER BY tc.table_schema, tc.table_name
  `, schemas);
  return result.rows.map((r: any) => ({
    from: `${r.from_schema}.${r.from_table}`,
    to: `${r.to_schema}.${r.to_table}`
  }));
}

/**
 * Fetch all schemas in DB (for llms.txt ALL_SCHEMAS / unrextracted schemas)
 */
async function fetchAllSchemas(client: Client): Promise<string[]> {
  const result = await client.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT LIKE 'pg_%'
      AND schema_name != 'information_schema'
      AND schema_name != 'pg_catalog'
    ORDER BY schema_name
  `);
  return result.rows.map((r: any) => r.schema_name);
}

/**
 * Extract table refs from function DDL (heuristic, best-effort)
 */
function extractTableRefsFromFunctionDdl(ddl: string, defaultSchema: string = 'public'): string[] {
  const seen = new Set<string>();
  const add = (schema: string, table: string) => {
    const key = `${schema}.${table}`;
    if (!seen.has(key)) seen.add(key);
  };
  // schema.table form
  const schemaTableRe = /(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM|INSERT\s+INTO)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = schemaTableRe.exec(ddl)) !== null) {
    add(m[1], m[2]);
  }
  // Unqualified table name (after FROM / JOIN / INSERT INTO / UPDATE / DELETE FROM)
  const unqualifiedRe = /(?:FROM|JOIN|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s|$|\)|,)/gi;
  while ((m = unqualifiedRe.exec(ddl)) !== null) {
    const name = m[1].toLowerCase();
    if (!['select', 'where', 'on', 'and', 'or', 'inner', 'left', 'right', 'outer', 'cross', 'lateral'].includes(name)) {
      add(defaultSchema, m[1]);
    }
  }
  return Array.from(seen).sort();
}

/**
 * Fetch functions
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

  // Initialize progress
  if (progress) {
    progress.functions.total = result.rows.length;
  }

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    
    // Update progress
    if (progress && spinner) {
      progress.functions.current = i + 1;
      displayProgress(progress, spinner);
    }
    
    // Build exact function signature (schema name and argument types)
    const functionSignature = `${row.schema_name}.${row.name}(${row.identity_args || ''})`;
    
    // Add function comment at top
    let ddl = '';
    if (!row.comment) {
      ddl += `-- Function: ${functionSignature}\n`;
    } else {
      ddl += `-- ${row.comment}\n`;
    }
    
    // Add function definition (ensure semicolon)
    let functionDef = row.definition;
    if (!functionDef.trim().endsWith(';')) {
      functionDef += ';';
    }
    ddl += functionDef + '\n\n';
    
    // Add COMMENT ON statement
    if (!row.comment) {
      ddl += `-- COMMENT ON FUNCTION ${functionSignature} IS '_your_comment_here_';\n\n`;
    } else {
      ddl += `COMMENT ON FUNCTION ${functionSignature} IS '${row.comment}';\n\n`;
    }
    
    functions.push({
      name: row.name,
      type: 'function',
      schema: row.schema_name,
      ddl,
      comment: row.comment,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }

  // Detect overloaded functions (same schema.name, different signatures)
  const nameCount = new Map<string, string[]>();
  for (const row of result.rows) {
    const key = `${row.schema_name}.${row.name}`;
    const sig = `${row.name}(${row.identity_args || ''})`;
    if (!nameCount.has(key)) nameCount.set(key, []);
    nameCount.get(key)!.push(sig);
  }
  const overloads = [...nameCount.entries()].filter(([, sigs]) => sigs.length > 1);
  if (overloads.length > 0) {
    console.warn('\n⚠ Overloaded RPC functions detected (same name, different signatures):');
    for (const [key, sigs] of overloads) {
      console.warn(`  ${key}`);
      for (const sig of sigs) {
        console.warn(`    - ${sig}`);
      }
    }
    console.warn('  Note: Only the last definition will be written to the output file.\n');
  }

  return functions;
}

/**
 * Fetch triggers
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

  // Initialize progress
  if (progress) {
    progress.triggers.total = result.rows.length;
  }

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    
    // Update progress
    if (progress && spinner) {
      progress.triggers.current = i + 1;
      displayProgress(progress, spinner);
    }
    
    // Add trigger description at top
    let ddl = `-- Trigger: ${row.trigger_name} on ${row.schema_name}.${row.table_name}\n`;
    ddl += `-- Database trigger that automatically executes in response to certain events\n\n`;
    ddl += row.definition + ';';
    
    triggers.push({
      name: `${row.schema_name}_${row.table_name}_${row.trigger_name}`,
      type: 'trigger',
      category: `${row.schema_name}.${row.table_name}`,
      schema: row.schema_name,
      ddl,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
  
  return triggers;
}

/**
 * Fetch Cron jobs (pg_cron extension)
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

    // Initialize progress
    if (progress) {
      progress.cronJobs.total = result.rows.length;
    }

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      
      // Update progress
      if (progress && spinner) {
        progress.cronJobs.current = i + 1;
        displayProgress(progress, spinner);
      }
      
      // Add Cron job description at top
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
    // Skip when pg_cron extension is not present
  }
  
  return cronJobs;
}

/**
 * Fetch custom types
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
      AND t.typisdefined = true  -- defined types only
      AND NOT t.typarray = 0     -- exclude array base types
      AND NOT EXISTS (
        -- exclude same-name as table, view, index, sequence, composite
        SELECT 1 FROM pg_class c 
        WHERE c.relname = t.typname 
          AND c.relnamespace = n.oid
      )
      AND NOT EXISTS (
        -- exclude same-name as function/procedure
        SELECT 1 FROM pg_proc p
        WHERE p.proname = t.typname
          AND p.pronamespace = n.oid
      )
      AND t.typname NOT LIKE 'pg_%'     -- exclude PostgreSQL built-in types
      AND t.typname NOT LIKE '_%'       -- exclude array types (leading underscore)
      AND t.typname NOT LIKE '%_old'    -- exclude deprecated types
      AND t.typname NOT LIKE '%_bak'    -- exclude backup types
      AND t.typname NOT LIKE 'tmp_%'    -- exclude temporary types
    ORDER BY n.nspname, t.typname
  `, schemas);

  // Initialize progress
  if (progress) {
    progress.customTypes.total = result.rows.length;
  }

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    
    // Update progress
    if (progress && spinner) {
      progress.customTypes.current = i + 1;
      displayProgress(progress, spinner);
    }
    
    let ddl = '';
    
    if (row.type_category === 'enum') {
      // Fetch ENUM type details
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
      
      // Generate DDL only when ENUM values exist
      if (enumResult.rows.length > 0) {
        const labels = enumResult.rows.map(r => `'${r.enumlabel}'`).join(', ');
        ddl = `CREATE TYPE ${row.type_name} AS ENUM (${labels});`;
      }
    } else if (row.type_category === 'composite') {
      // Fetch COMPOSITE type details
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
        AND NOT a.attisdropped  -- exclude dropped columns
        ORDER BY a.attnum
      `, [row.type_name, row.schema_name]);
      
      // Generate DDL only when composite type has attributes
      if (compositeResult.rows.length > 0) {
        const columns = compositeResult.rows
          .map(r => `  ${r.column_name} ${r.column_type}`)
          .join(',\n');
        ddl = `CREATE TYPE ${row.type_name} AS (\n${columns}\n);`;
      }
    } else if (row.type_category === 'domain') {
      // Fetch DOMAIN type details
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
      // Add type comment at top
      let finalDdl = '';
      if (!row.comment) {
        finalDdl += `-- Type: ${row.type_name}\n`;
      } else {
        finalDdl += `-- ${row.comment}\n`;
      }
      
      // Add type definition
      finalDdl += ddl + '\n\n';
      
      // Add COMMENT ON statement
      if (!row.comment) {
        finalDdl += `-- COMMENT ON TYPE ${row.schema_name}.${row.type_name} IS '_your_comment_here_';\n\n`;
      } else {
        finalDdl += `COMMENT ON TYPE ${row.schema_name}.${row.type_name} IS '${row.comment}';\n\n`;
      }
      
      types.push({
        name: row.type_name,
        type: 'type',
        schema: row.schema_name,
        ddl: finalDdl,
        comment: row.comment,
        timestamp: Math.floor(Date.now() / 1000)
      });
    }
  }
  
  return types;
}

/**
 * Fetch table definitions from database
 */
async function fetchTableDefinitions(client: Client, spinner?: any, progress?: ProgressTracker, schemas: string[] = ['public']): Promise<TableDefinition[]> {
  const definitions: TableDefinition[] = [];

  const schemaPlaceholders = schemas.map((_, index) => `$${index + 1}`).join(', ');
  
  // Fetch table list
  const tablesResult = await client.query(`
    SELECT tablename, schemaname, 'table' as type
    FROM pg_tables 
    WHERE schemaname IN (${schemaPlaceholders})
    ORDER BY schemaname, tablename
  `, schemas);

  // Fetch view list
  const viewsResult = await client.query(`
    SELECT viewname as tablename, schemaname, 'view' as type
    FROM pg_views 
    WHERE schemaname IN (${schemaPlaceholders})
    ORDER BY schemaname, viewname
  `, schemas);

  const allObjects = [...tablesResult.rows, ...viewsResult.rows];
  const tableCount = tablesResult.rows.length;
  const viewCount = viewsResult.rows.length;

  // Initialize progress
  if (progress) {
    progress.tables.total = tableCount;
    progress.views.total = viewCount;
  }

  // Process tables/views with limited concurrency (cap connection count)
  // Max configurable via env (default 20, max 50)
  const envValue = process.env.SUPATOOL_MAX_CONCURRENT || '20';
  const MAX_CONCURRENT = Math.min(50, parseInt(envValue));
  // Use env value (capped at minimum 5)
  const CONCURRENT_LIMIT = Math.max(5, MAX_CONCURRENT);
  
  // Debug log (development only)
  if (process.env.NODE_ENV === 'development' || process.env.SUPATOOL_DEBUG) {
    console.log(`Processing ${allObjects.length} objects with ${CONCURRENT_LIMIT} concurrent operations`);
  }
  
  // Promise factory for table/view processing
  const processObject = async (obj: any, index: number) => {
    const isTable = obj.type === 'table';
    const name = obj.tablename;
    const schemaName = obj.schemaname;
    const type = obj.type as 'table' | 'view';

    let ddl = '';
    let comment = '';
    let timestamp = Math.floor(new Date('2020-01-01').getTime() / 1000);

    if (type === 'table') {
      // Table case
      try {
        // Get table last updated time
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
        // On error use default timestamp
      }

      // Generate CREATE TABLE statement
      ddl = await generateCreateTableDDL(client, name, schemaName);
      
      // Get table comment
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
        // On error no comment
      }
    } else {
      // View case
      try {
        // Get view definition and security_invoker setting
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
          
          // Get view comment
          const viewCommentResult = await client.query(`
            SELECT obj_description(c.oid) as view_comment
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = $1 AND n.nspname = $2 AND c.relkind = 'v'
          `, [name, schemaName]);

          // Add view comment at top
          if (viewCommentResult.rows.length > 0 && viewCommentResult.rows[0].view_comment) {
            comment = viewCommentResult.rows[0].view_comment;
            ddl = `-- ${comment}\n`;
          } else {
            ddl = `-- View: ${name}\n`;
          }

          // Add view definition
          let ddlStart = `CREATE OR REPLACE VIEW ${schemaName}.${name}`;
          
          // Check security_invoker setting
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
          
          // Add COMMENT ON statement
          if (viewCommentResult.rows.length > 0 && viewCommentResult.rows[0].view_comment) {
            ddl += `COMMENT ON VIEW ${schemaName}.${name} IS '${comment}';\n\n`;
          } else {
            ddl += `-- COMMENT ON VIEW ${schemaName}.${name} IS '_your_comment_here_';\n\n`;
          }

          // Get view creation time (if available)
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
            // On error use default timestamp
          }
        }
      } catch (error) {
        // On error no comment
      }
    }

    return {
      name,
      type,
      schema: schemaName,
      ddl,
      timestamp,
      comment: comment || undefined,
      isTable
    };
  };

  // Simple batch concurrency (reliable progress updates)
  const processedResults: (TableDefinition | null)[] = [];
  
  for (let i = 0; i < allObjects.length; i += CONCURRENT_LIMIT) {
    const batch = allObjects.slice(i, i + CONCURRENT_LIMIT);
    
         // Process batch in parallel
     const batchPromises = batch.map(async (obj, batchIndex) => {
       try {
         const globalIndex = i + batchIndex;
         
         // Debug: start
         if (process.env.SUPATOOL_DEBUG) {
           console.log(`Starting ${obj.type} ${obj.tablename} (${globalIndex + 1}/${allObjects.length})`);
         }
         
         const result = await processObject(obj, globalIndex);
         
         // Debug: done
         if (process.env.SUPATOOL_DEBUG) {
           console.log(`Completed ${obj.type} ${obj.tablename} (${globalIndex + 1}/${allObjects.length})`);
         }
         
         // Update progress immediately on each completion
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
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    processedResults.push(...batchResults);
  }

  // Add to definitions excluding nulls
  for (const result of processedResults) {
    if (result) {
      const { isTable, ...definition } = result as any;
      definitions.push(definition);
    }
  }

  return definitions;
}

/**
 * Generate CREATE TABLE DDL (concurrent version)
 */
async function generateCreateTableDDL(client: Client, tableName: string, schemaName: string = 'public'): Promise<string> {
  // Run all queries in parallel
  const [
    columnsResult,
    primaryKeyResult,
    tableCommentResult,
    columnCommentsResult,
    uniqueConstraintResult,
    foreignKeyResult
  ] = await Promise.all([
    // Get column info
    client.query(`
      SELECT
        c.column_name,
        c.data_type,
        c.udt_name,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default,
        c.is_generated,
        c.generation_expression,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS full_type
      FROM information_schema.columns c
      JOIN pg_class cl ON cl.relname = c.table_name
      JOIN pg_namespace ns ON ns.nspname = c.table_schema AND ns.oid = cl.relnamespace
      JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attname = c.column_name
      WHERE c.table_schema = $1
        AND c.table_name = $2
      ORDER BY c.ordinal_position
    `, [schemaName, tableName]),
    
    // Get primary key info
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
    
    // Get table comment
    client.query(`
      SELECT obj_description(c.oid) as table_comment
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = $1 AND n.nspname = $2 AND c.relkind = 'r'
    `, [tableName, schemaName]),
    
    // Get column comments
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
    
    // Get UNIQUE constraints
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
    
    // Get FOREIGN KEY constraints
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

  // Add table comment at top (with schema name)
  let ddl = '';
  
  // Add table comment at top
  if (tableCommentResult.rows.length > 0 && tableCommentResult.rows[0].table_comment) {
    ddl += `-- ${tableCommentResult.rows[0].table_comment}\n`;
  } else {
    ddl += `-- Table: ${schemaName}.${tableName}\n`;
  }
  
  // Generate CREATE TABLE (schema-qualified)
  ddl += `CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (\n`;
  const columnDefs: string[] = [];
  for (const col of columnsResult.rows) {
    const rawType: string = col.full_type ||
      ((col.data_type === 'USER-DEFINED' && col.udt_name) ? col.udt_name : col.data_type);
    let colDef = `  ${col.column_name} ${rawType}`;
    
    // Length spec
    if (col.character_maximum_length) {
      colDef += `(${col.character_maximum_length})`;
    }
    
    // Generated column
    if (col.is_generated === 'ALWAYS') {
      colDef += ` GENERATED ALWAYS AS (${col.generation_expression}) STORED`;
    } else {
      // NOT NULL constraint
      if (col.is_nullable === 'NO') {
        colDef += ' NOT NULL';
      }
      // Default value
      if (col.column_default) {
        colDef += ` DEFAULT ${col.column_default}`;
      }
    }
    
    columnDefs.push(colDef);
  }
  
  ddl += columnDefs.join(',\n');
  
  // Primary key constraint
  if (primaryKeyResult.rows.length > 0) {
    const pkColumns = primaryKeyResult.rows.map(row => row.column_name);
    ddl += `,\n  PRIMARY KEY (${pkColumns.join(', ')})`;
  }

  // Add UNIQUE constraints inside CREATE TABLE
  for (const unique of uniqueConstraintResult.rows) {
    ddl += `,\n  CONSTRAINT ${unique.constraint_name} UNIQUE (${unique.columns})`;
  }

  // Add FOREIGN KEY constraints inside CREATE TABLE
  for (const fk of foreignKeyResult.rows) {
    ddl += `,\n  CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.columns}) REFERENCES ${fk.foreign_table_schema}.${fk.foreign_table_name} (${fk.foreign_columns})`;
  }

  // Add CHECK constraints inside CREATE TABLE (must be last)
  const checkConstraintResult = await client.query(`
    SELECT 
      con.conname as constraint_name,
      pg_get_constraintdef(con.oid) as check_clause
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE lower(rel.relname) = lower($1)
      AND nsp.nspname = $2
      AND con.contype = 'c'
    ORDER BY con.conname
  `, [tableName, schemaName]);
  for (const check of checkConstraintResult.rows) {
    ddl += `,\n  CONSTRAINT ${check.constraint_name} ${check.check_clause}`;
  }
  
  ddl += '\n);\n\n';

  // Add COMMENT ON statements
  if (tableCommentResult.rows.length > 0 && tableCommentResult.rows[0].table_comment) {
    ddl += `COMMENT ON TABLE ${schemaName}.${tableName} IS '${tableCommentResult.rows[0].table_comment}';\n\n`;
  } else {
    ddl += `-- COMMENT ON TABLE ${schemaName}.${tableName} IS '_your_comment_here_';\n\n`;
  }

  // Add column comments (with schema name)
  if (columnComments.size > 0) {
    ddl += '\n-- Column comments\n';
    for (const [columnName, comment] of columnComments) {
      ddl += `COMMENT ON COLUMN ${schemaName}.${tableName}.${columnName} IS '${comment}';\n`;
    }
  }

  return ddl;
}

/**
 * Save definitions to files (merge RLS/triggers into table/view; schema folders when multi-schema)
 */
async function saveDefinitionsByType(
  definitions: TableDefinition[],
  outputDir: string,
  separateDirectories: boolean = true,
  schemas: string[] = ['public'],
  relations: SchemaRelation[] = [],
  rpcTables: RpcTableUsage[] = [],
  allSchemas: string[] = [],
  version?: string,
  tableRlsStatus: TableRlsStatus[] = []
): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  const outputDate = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const npmUrl = 'https://www.npmjs.com/package/supatool';
  const headerComment = version
    ? `-- Generated by supatool v${version}, ${outputDate} | ${npmUrl}\n`
    : `-- Generated by supatool, ${outputDate} | ${npmUrl}\n`;

  const tables = definitions.filter(d => d.type === 'table');
  const views = definitions.filter(d => d.type === 'view');
  const rlsList = definitions.filter(d => d.type === 'rls');
  const triggersList = definitions.filter(d => d.type === 'trigger');
  const functions = definitions.filter(d => d.type === 'function');
  const cronJobs = definitions.filter(d => d.type === 'cron');
  const customTypes = definitions.filter(d => d.type === 'type');

  // schema.table -> RLS DDL
  const rlsByCategory = new Map<string, string>();
  for (const r of rlsList) {
    if (r.category) rlsByCategory.set(r.category, r.ddl);
  }
  // schema.table -> trigger DDL array
  const triggersByCategory = new Map<string, string[]>();
  for (const t of triggersList) {
    if (!t.category) continue;
    const list = triggersByCategory.get(t.category) ?? [];
    list.push(t.ddl);
    triggersByCategory.set(t.category, list);
  }

  // schema.table -> RLS status (for appending comment/DDL when no policies)
  const rlsStatusByCategory = new Map<string, TableRlsStatus>();
  for (const s of tableRlsStatus) {
    rlsStatusByCategory.set(`${s.schema}.${s.table}`, s);
  }

  // Build merged DDL (table/view + RLS + triggers). Tables with RLS disabled or 0 policies get a comment block in the file.
  const mergeRlsAndTriggers = (def: TableDefinition): string => {
    const cat = def.schema && def.name ? `${def.schema}.${def.name}` : def.category ?? '';
    let ddl = def.ddl.trimEnd();
    const rlsDdl = rlsByCategory.get(cat);
    if (rlsDdl) {
      ddl += '\n\n' + rlsDdl.trim();
    } else if (def.type === 'table' && def.schema && def.name) {
      const rlsStatus = rlsStatusByCategory.get(cat);
      if (rlsStatus) {
        if (!rlsStatus.rlsEnabled) {
          ddl += '\n\n-- RLS: disabled. Consider enabling for production.';
          ddl += '\n-- ALTER TABLE ' + def.schema + '.' + def.name + ' ENABLE ROW LEVEL SECURITY;';
        } else if (rlsStatus.policyCount === 0) {
          ddl += '\n\n-- RLS: enabled, no policies defined';
          ddl += '\nALTER TABLE ' + def.schema + '.' + def.name + ' ENABLE ROW LEVEL SECURITY;';
        }
      }
    }
    const trgList = triggersByCategory.get(cat);
    if (trgList && trgList.length > 0) {
      ddl += '\n\n' + trgList.map(t => t.trim()).join('\n\n');
    }
    return ddl.endsWith('\n') ? ddl : ddl + '\n';
  };

  const mergedTables: TableDefinition[] = tables.map(t => ({
    ...t,
    ddl: mergeRlsAndTriggers(t)
  }));
  const mergedViews: TableDefinition[] = views.map(v => ({
    ...v,
    ddl: mergeRlsAndTriggers(v)
  }));

  const toWrite: TableDefinition[] = [
    ...mergedTables,
    ...mergedViews,
    ...functions,
    ...cronJobs,
    ...customTypes
  ];

  const multiSchema = schemas.length > 1;
  const typeDirNames = {
    table: 'tables',
    view: 'views',
    function: 'rpc',
    cron: 'cron',
    type: 'types'
  } as const;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fsPromises = await import('fs/promises');

  for (const def of toWrite) {
    const typeDir = typeDirNames[def.type as keyof typeof typeDirNames];
    const baseTypeDir = separateDirectories ? typeDir : '.';
    const targetDir = multiSchema && def.schema
      ? path.join(outputDir, def.schema, baseTypeDir)
      : path.join(outputDir, baseTypeDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = `${def.name}.sql`;
    const filePath = path.join(targetDir, fileName);
    const ddlWithNewline = def.ddl.endsWith('\n') ? def.ddl : def.ddl + '\n';
    await fsPromises.writeFile(filePath, headerComment + ddlWithNewline);
  }

  await generateIndexFile(toWrite, outputDir, separateDirectories, multiSchema, relations, rpcTables, allSchemas, schemas, version, tableRlsStatus);
}

/**
 * Generate index file for DB objects (RLS/triggers already merged into table/view)
 */
async function generateIndexFile(
  definitions: TableDefinition[],
  outputDir: string,
  separateDirectories: boolean = true,
  multiSchema: boolean = false,
  relations: SchemaRelation[] = [],
  rpcTables: RpcTableUsage[] = [],
  allSchemas: string[] = [],
  extractedSchemas: string[] = [],
  version?: string,
  tableRlsStatus: TableRlsStatus[] = []
): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  const outputDate = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const npmUrl = 'https://www.npmjs.com/package/supatool';
  const headerLine = version
    ? `Generated by supatool v${version}, ${outputDate} | ${npmUrl}\n\n`
    : `Generated by supatool, ${outputDate} | ${npmUrl}\n\n`;
  const readmeHeader = version
    ? `Generated by [supatool](${npmUrl}) v${version}, ${outputDate}\n\n`
    : `Generated by [supatool](${npmUrl}), ${outputDate}\n\n`;

  const typeDirNames: Record<string, string> = {
    table: 'tables',
    view: 'views',
    function: 'rpc',
    cron: 'cron',
    type: 'types'
  };

  const typeLabels: Record<string, string> = {
    table: 'Tables',
    view: 'Views',
    function: 'Functions',
    cron: 'Cron Jobs',
    type: 'Custom Types'
  };

  const groupedDefs = {
    table: definitions.filter(def => def.type === 'table'),
    view: definitions.filter(def => def.type === 'view'),
    function: definitions.filter(def => def.type === 'function'),
    cron: definitions.filter(def => def.type === 'cron'),
    type: definitions.filter(def => def.type === 'type')
  };

  // schema.table -> RLS status (for Tables docs and warnings)
  const rlsMap = new Map<string, TableRlsStatus>();
  for (const s of tableRlsStatus) {
    rlsMap.set(`${s.schema}.${s.table}`, s);
  }

  const formatRlsNote = (schema: string, name: string): string => {
    const s = rlsMap.get(`${schema}.${name}`);
    if (!s) return '';
    if (!s.rlsEnabled) return ' **⚠️ RLS disabled**';
    if (s.policyCount === 0) return ' (RLS: enabled, policies: 0)';
    return ` (RLS: enabled, policies: ${s.policyCount})`;
  };

  // Build relative path per file (schema/type/file when multiSchema)
  const getRelPath = (def: TableDefinition): string => {
    const typeDir = separateDirectories ? (typeDirNames[def.type] ?? def.type) : '.';
    const fileName = `${def.name}.sql`;
    if (multiSchema && def.schema) {
      return `${def.schema}/${typeDir}/${fileName}`;
    }
    return separateDirectories ? `${typeDir}/${fileName}` : fileName;
  };

  // === Human-readable README.md (description + link to llms.txt) ===
  let readmeContent = readmeHeader;
  readmeContent += '# Schema (extract output)\n\n';
  readmeContent += 'This folder contains DDL exported by `supatool extract`.\n\n';
  readmeContent += '- **tables/** – Table definitions (with RLS and triggers in the same file)\n';
  readmeContent += '- **views/** – View definitions\n';
  readmeContent += '- **rpc/** – Functions\n';
  readmeContent += '- **cron/** – Cron jobs\n';
  readmeContent += '- **types/** – Custom types\n\n';
  if (multiSchema) {
    readmeContent += 'When multiple schemas are extracted, each schema has its own subfolder (e.g. `public/tables/`, `agent/views/`).\n\n';
  }
  readmeContent += 'Full catalog and relations: [llms.txt](llms.txt)\n';
  if (tableRlsStatus.some(s => !s.rlsEnabled)) {
    readmeContent += '\n⚠️ Tables with RLS disabled: [rls_warnings.md](rls_warnings.md)\n';
  }

  // === llms.txt ===
  let llmsContent = headerLine;
  llmsContent += 'Database Schema - Complete Objects Catalog\n';
  llmsContent += '(Tables/Views include RLS and Triggers in the same file)\n\n';
  llmsContent += 'SUMMARY\n';
  Object.entries(groupedDefs).forEach(([type, defs]) => {
    if (defs.length > 0 && typeLabels[type]) {
      llmsContent += `${typeLabels[type]}: ${defs.length}\n`;
    }
  });
  llmsContent += '\nOBJECTS\n';
  definitions.forEach(def => {
    const filePath = getRelPath(def);
    const commentSuffix = def.comment ? ` # ${def.comment}` : '';
    const displayName = def.schema ? `${def.schema}.${def.name}` : def.name;
    const rlsSuffix = def.type === 'table' && def.schema ? formatRlsNote(def.schema, def.name) : '';
    llmsContent += `${def.type}:${displayName}:${filePath}${commentSuffix}${rlsSuffix}\n`;
  });

  if (relations.length > 0) {
    llmsContent += '\nRELATIONS\n';
    relations.forEach(r => {
      llmsContent += `${r.from} -> ${r.to}\n`;
    });
  }
  if (rpcTables.length > 0) {
    llmsContent += '\nRPC_TABLES\n';
    rpcTables.forEach(rt => {
      llmsContent += `${rt.rpc}: ${rt.tables.join(', ')}\n`;
    });
  }

  if (allSchemas.length > 0) {
    const extractedSet = new Set(extractedSchemas);
    const extractedList = allSchemas.filter(s => extractedSet.has(s));
    const notExtractedList = allSchemas.filter(s => !extractedSet.has(s));
    llmsContent += '\nALL_SCHEMAS\n';
    llmsContent += 'EXTRACTED\n';
    extractedList.forEach(schemaName => {
      llmsContent += `${schemaName}\n`;
    });
    llmsContent += '\nNOT_EXTRACTED\n';
    notExtractedList.forEach(schemaName => {
      llmsContent += `${schemaName}\n`;
    });
  }

  const readmePath = path.join(outputDir, 'README.md');
  const llmsPath = path.join(outputDir, 'llms.txt');
  fs.writeFileSync(readmePath, readmeContent);
  fs.writeFileSync(llmsPath, llmsContent);

  // schema_index.json (same data for agents that parse JSON)
  const schemaIndex = {
    objects: definitions.map(def => {
      const base: { type: string; name: string; path: string; comment?: string; rls?: string } = {
        type: def.type,
        name: def.schema ? `${def.schema}.${def.name}` : def.name,
        path: getRelPath(def),
        ...(def.comment && { comment: def.comment })
      };
      if (def.type === 'table' && def.schema) {
        const s = rlsMap.get(`${def.schema}.${def.name}`);
        if (s) {
          base.rls = s.rlsEnabled ? (s.policyCount === 0 ? 'enabled_no_policies' : `enabled_${s.policyCount}_policies`) : 'disabled';
        }
      }
      return base;
    }),
    relations: relations.map(r => ({ from: r.from, to: r.to })),
    rpc_tables: rpcTables.map(rt => ({ rpc: rt.rpc, tables: rt.tables })),
    all_schemas: allSchemas.length > 0
      ? {
          extracted: allSchemas.filter(s => extractedSchemas.includes(s)),
          not_extracted: allSchemas.filter(s => !extractedSchemas.includes(s))
        }
      : undefined
  };
  fs.writeFileSync(path.join(outputDir, 'schema_index.json'), JSON.stringify(schemaIndex, null, 2), 'utf8');

  // schema_summary.md (one-file overview for AI) — include RLS status per table
  let summaryMd = '# Schema summary\n\n';
  const tableDefs = definitions.filter(d => d.type === 'table' || d.type === 'view');
  if (tableDefs.length > 0) {
    summaryMd += '## Tables / Views\n';
    tableDefs.forEach(d => {
      const name = d.schema ? `${d.schema}.${d.name}` : d.name;
      const rlsNote = d.type === 'table' && d.schema ? formatRlsNote(d.schema, d.name) : '';
      summaryMd += d.comment ? `- ${name}${rlsNote} (# ${d.comment})\n` : `- ${name}${rlsNote}\n`;
    });
    summaryMd += '\n';
  }
  if (relations.length > 0) {
    summaryMd += '## Relations\n';
    relations.forEach(r => {
      summaryMd += `- ${r.from} -> ${r.to}\n`;
    });
    summaryMd += '\n';
  }
  if (rpcTables.length > 0) {
    summaryMd += '## RPC → Tables\n';
    rpcTables.forEach(rt => {
      summaryMd += `- ${rt.rpc}: ${rt.tables.join(', ')}\n`;
    });
    summaryMd += '\n';
  }
  if (allSchemas.length > 0) {
    const extractedSet = new Set(extractedSchemas);
    summaryMd += '## Schemas\n';
    summaryMd += `- Extracted: ${allSchemas.filter(s => extractedSet.has(s)).join(', ') || '(none)'}\n`;
    summaryMd += `- Not extracted: ${allSchemas.filter(s => !extractedSet.has(s)).join(', ') || '(none)'}\n`;
  }
  fs.writeFileSync(path.join(outputDir, 'schema_summary.md'), summaryMd, 'utf8');

  // RLS disabled tables warning doc (tables only; RLS enabled with 0 policies is not warned)
  const rlsNotEnabled = tableRlsStatus.filter(s => !s.rlsEnabled);
  if (rlsNotEnabled.length > 0) {
    let warnMd = '# Tables with RLS disabled (warning)\n\n';
    warnMd += 'The following tables do not have Row Level Security enabled.\n';
    warnMd += 'Enabling RLS is recommended for production security.\n\n';
    warnMd += '| Schema | Table |\n|--------|-------|\n';
    rlsNotEnabled.forEach(s => {
      warnMd += `| ${s.schema} | ${s.table} |\n`;
    });
    fs.writeFileSync(path.join(outputDir, 'rls_warnings.md'), warnMd, 'utf8');
  }
}

/**
 * Classify and output definitions
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
    schemas = ['public'],
    version
  } = options;

  // Disable Node.js SSL certificate verification
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // Connection string validation
  if (!connectionString) {
    throw new Error('Connection string is not configured. Please set it using one of:\n' +
      '1. --connection option\n' +
      '2. SUPABASE_CONNECTION_STRING environment variable\n' +
      '3. DATABASE_URL environment variable\n' +
      '4. supatool.config.json configuration file');
  }

  // Connection string format validation
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error(`Invalid connection string format: ${connectionString}\n` +
      'Correct format: postgresql://username:password@host:port/database');
  }

  // URL encode password part
  let encodedConnectionString = connectionString;
  console.log('🔍 Original connection string:', connectionString);
  
  try {
    // Special handling when password contains @
    if (connectionString.includes('@') && connectionString.split('@').length > 2) {
      console.log('⚠️ Password contains @, executing special handling');
      // Use last @ as delimiter
      const parts = connectionString.split('@');
      const lastPart = parts.pop(); // Last part (host:port/database)
      const firstParts = parts.join('@'); // First part (postgresql://user:password)
      
      console.log('   Split result:');
      console.log('   First part:', firstParts);
      console.log('   Last part:', lastPart);
      
      // Encode password part
      const colonIndex = firstParts.lastIndexOf(':');
      if (colonIndex > 0) {
        const protocolAndUser = firstParts.substring(0, colonIndex);
        const password = firstParts.substring(colonIndex + 1);
        const encodedPassword = encodeURIComponent(password);
        encodedConnectionString = `${protocolAndUser}:${encodedPassword}@${lastPart}`;
        
        console.log('   Encode result:');
        console.log('   Protocol+User:', protocolAndUser);
        console.log('   Original password:', password);
        console.log('   Encoded password:', encodedPassword);
        console.log('   Final connection string:', encodedConnectionString);
      }
    } else {
      console.log('✅ Executing normal URL parsing');
      // Normal URL parsing
      const url = new URL(connectionString);
      
      // Handle username containing dots
      if (url.username && url.username.includes('.')) {
        console.log(`Username (with dots): ${url.username}`);
      }
      
      if (url.password) {
        // Encode only password part
        const encodedPassword = encodeURIComponent(url.password);
        url.password = encodedPassword;
        encodedConnectionString = url.toString();
        console.log('   Password encoded:', encodedPassword);
      }
    }
    
    // Add SSL settings for Supabase connection
    if (!encodedConnectionString.includes('sslmode=')) {
      const separator = encodedConnectionString.includes('?') ? '&' : '?';
      encodedConnectionString += `${separator}sslmode=require`;
      console.log('   SSL setting added:', encodedConnectionString);
    }
    
    // Display debug info (password hidden)
    const debugUrl = new URL(encodedConnectionString);
    const maskedPassword = debugUrl.password ? '*'.repeat(debugUrl.password.length) : '';
    debugUrl.password = maskedPassword;
    console.log('🔍 Connection info:');
    console.log(`   Host: ${debugUrl.hostname}`);
    console.log(`   Port: ${debugUrl.port}`);
    console.log(`   Database: ${debugUrl.pathname.slice(1)}`);
    console.log(`   User: ${debugUrl.username}`);
    console.log(`   SSL: ${debugUrl.searchParams.get('sslmode') || 'require'}`);
  } catch (error) {
    // Use original string if URL parsing fails
    console.warn('Failed to parse connection string URL. May contain special characters.');
    console.warn('Error details:', error instanceof Error ? error.message : String(error));
  }

  const fs = await import('fs');
  const readline = await import('readline');

  // Overwrite confirmation
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

  // Dynamic import for spinner
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
    // Debug before connect
    console.log('🔧 Connection settings:');
    console.log(`   SSL: rejectUnauthorized=false`);
    console.log(`   Connection string length: ${encodedConnectionString.length}`);
    
    await client.connect();
    spinner.text = 'Connected to database';

    let allDefinitions: TableDefinition[] = [];

    // Initialize progress tracker
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
      // Get total count for each object type first
      spinner.text = 'Counting database objects...';
      
      // Get total tables/views count
      const tablesCountResult = await client.query('SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = \'public\'');
      const viewsCountResult = await client.query('SELECT COUNT(*) as count FROM pg_views WHERE schemaname = \'public\'');
      progress.tables.total = parseInt(tablesCountResult.rows[0].count);
      progress.views.total = parseInt(viewsCountResult.rows[0].count);
      
      // Get total RLS policy count (per table)
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
      
      // Get total functions count
      const functionsCountResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
      `);
      progress.functions.total = parseInt(functionsCountResult.rows[0].count);
      
      // Get total triggers count
      const triggersCountResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
      `);
      progress.triggers.total = parseInt(triggersCountResult.rows[0].count);
      
      // Get total Cron jobs count
      try {
        const cronCountResult = await client.query('SELECT COUNT(*) as count FROM cron.job');
        progress.cronJobs.total = parseInt(cronCountResult.rows[0].count);
      } catch (error) {
        progress.cronJobs.total = 0;
      }
      
      // Get total custom types count
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

      // When --all: fetch all objects (sequential)
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
      // Legacy path (tables/views only)
      // Get total tables/views count
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
    
    // Pattern matching
    if (tablePattern !== '*') {
      const regex = new RegExp(tablePattern.replace(/\*/g, '.*'));
      allDefinitions = allDefinitions.filter(def => regex.test(def.name));
    }

    // Fetch for RELATIONS / RPC_TABLES (llms.txt upgrade)
    let relations: SchemaRelation[] = [];
    let rpcTables: RpcTableUsage[] = [];
    let allSchemas: string[] = [];
    try {
      allSchemas = await fetchAllSchemas(client);
      relations = await fetchRelationList(client, schemas);
      const funcDefs = allDefinitions.filter(d => d.type === 'function');
      for (const f of funcDefs) {
        const tables = extractTableRefsFromFunctionDdl(f.ddl, f.schema ?? 'public');
        if (tables.length > 0) {
          rpcTables.push({
            rpc: f.schema ? `${f.schema}.${f.name}` : f.name,
            tables
          });
        }
      }
    } catch (err) {
      if (process.env.SUPATOOL_DEBUG) {
        console.warn('RELATIONS/RPC_TABLES extraction skipped:', err);
      }
    }

    // RLS status (for Tables docs, rls_warnings.md, and extract-time warning)
    let tableRlsStatus: TableRlsStatus[] = [];
    try {
      const tableDefs = allDefinitions.filter(d => d.type === 'table');
      if (tableDefs.length > 0) {
        tableRlsStatus = await fetchTableRlsStatus(client, schemas);
      }
    } catch (err) {
      if (process.env.SUPATOOL_DEBUG) {
        console.warn('RLS status fetch skipped:', err);
      }
    }

    // When force: remove output dir then write (so removed tables don't leave files)
    if (force && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }

    // Save definitions (table+RLS+triggers merged, schema folders)
    spinner.text = 'Saving definitions to files...';
    await saveDefinitionsByType(allDefinitions, outputDir, separateDirectories, schemas, relations, rpcTables, allSchemas, version, tableRlsStatus);

    // Warn at extract time when any table has RLS disabled
    const rlsNotEnabled = tableRlsStatus.filter(s => !s.rlsEnabled);
    if (rlsNotEnabled.length > 0) {
      console.warn('');
      console.warn('⚠️  Tables with RLS disabled: ' + rlsNotEnabled.map(s => `${s.schema}.${s.table}`).join(', '));
      console.warn('   Details: ' + outputDir + '/rls_warnings.md');
      console.warn('');
    }

    // Show stats
    const counts = {
      table: allDefinitions.filter(def => def.type === 'table').length,
      view: allDefinitions.filter(def => def.type === 'view').length,
      rls: allDefinitions.filter(def => def.type === 'rls').length,
      function: allDefinitions.filter(def => def.type === 'function').length,
      trigger: allDefinitions.filter(def => def.type === 'trigger').length,
      cron: allDefinitions.filter(def => def.type === 'cron').length,
      type: allDefinitions.filter(def => def.type === 'type').length
    };

    // Stop progress display
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
    // Stop progress display (on error)
    stopProgressDisplay();
    spinner.fail('Extraction failed');
    console.error('Error:', error);
    throw error;
  } finally {
    try {
      await client.end();
    } catch (closeError) {
      // Ignore DB connection close errors (e.g. already disconnected)
    }
  }
}

export { generateCreateTableDDL };