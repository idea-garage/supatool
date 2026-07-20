# Changelog

All notable changes to this project will be documented in this file.

## v0.6.6
### Fixed
- **extract**: Primary key and UNIQUE constraint extraction now uses schema-qualified `pg_catalog` queries. This prevents columns from same-named constraints on same-named tables in other schemas from leaking into generated DDL while reducing catalog query cost.
- **extract**: Catalog analysis now honors `SUPATOOL_MAX_CONCURRENT=1`, bounds the queue on the single PostgreSQL client, and applies finite connection and query timeouts.
- **extract**: Catalog query failures now abort before definitions are saved instead of producing partial table or view output. Absence of the optional `pg_cron` relation remains non-fatal.

## v0.6.5
### Fixed
- **extract**: Primary key and UNIQUE constraint extraction now joins `information_schema.table_constraints` to `key_column_usage` by constraint catalog, schema, and name. This prevents columns from same-named constraints on same-named tables in other schemas from leaking into generated DDL.

## v0.6.4
### Fixed
- **extract `--schema-only`**: Previously extracted tables only, causing RPC/cron/types files to be absent from `writtenPaths` and deleted by `--force`. `--schema-only` now implies full object extraction (equivalent to `--all`) for the target schema.
- **extract**: `schema_index.json` was rewritten on every run due to a trailing newline mismatch between the written content and the existing file. Trailing `\n` removed; content is now compared correctly and the file is skipped when unchanged.
- **extract**: `rls_warnings.md` was never deleted even after all RLS violations were resolved, leaving a stale warning file. It is now removed when no disabled-RLS tables are found.

## v0.6.3
### Fixed
- **extract `--schema-only`**: Single-schema runs now correctly write to `<outputDir>/<schema>/` subdirectories. Previously, `--schema foo --schema-only` treated the run as non-multi-schema and wrote files flat into `<outputDir>/`, causing both incorrect output paths and unintended deletion of other schemas' files when `--force` was combined.
- **extract `--schema-only --force`**: Stale file deletion is now always scoped to the target schema directories regardless of how many schemas are specified. Previously the scope restriction was incorrectly gated on `schemas.length > 1`.
- **extract**: Composite foreign keys no longer expand to N² columns in generated DDL. The previous query joined `information_schema.key_column_usage` × `constraint_column_usage` on constraint name alone, producing N² rows for an N-column composite FK (e.g. 2-column FK → 4 columns). Replaced with a `pg_constraint`-based query using `unnest(conkey/confkey) WITH ORDINALITY` to resolve column names in correct order without duplication.

### Added
- **extract `--schema-only`**: CLI now rejects invalid option combinations with a clear error message:
  - `--schema-only` without `--schema`
  - `--schema-only --all`
  - `--schema-only --all-schemas`

## v0.6.2
### Added
- **extract `--schema-only`**: Regenerates only the specified schema's files without touching other schemas or shared index files (`llms.txt`, `schema_index.json`, `README.md`, etc.). Useful when multiple schemas are extracted and only one needs to be refreshed. When combined with `--force`, stale `.sql` file deletion is also scoped to the target schema directories only.

### Changed
- **extract**: Index files (`llms.txt`, `README.md`, `schema_index.json`, `schema_summary.md`, `rls_warnings.md`) are now skipped if their content is unchanged (header date line excluded from comparison). Prevents unnecessary Git diffs on re-extraction when the schema has not changed.
- **extract**: Removed connection string and password logging from standard output. Credentials (raw connection string, password, encoded password) are no longer printed. Connection details (host, port, database, user) are available only when `SUPATOOL_DEBUG=1` is set.

## v0.6.1
### Changed
- **extract**: Skip writing a `.sql` file when its content is unchanged (header line excluded from comparison). Prevents unnecessary file churn on re-extraction and preserves file modification times for unmodified objects.
- **extract `--force`**: No longer deletes the entire output directory. Instead, only `.sql` files whose corresponding DB object no longer exists are removed. Index files (`llms.txt`, `README.md`, etc.) are always regenerated.
- **extract `-e`**: When `--schema` is not explicitly specified, `-e` alone now implies all-schemas mode — all schemas in the DB are targeted except the excluded ones. `--all-schemas -e ...` still works and behaves identically.

## v0.6.0
### Changed
- **Breaking: default paths** changed from `supabase/` to `db/`:
  - `schemaDir`: `./supabase/schemas` → `./db/schemas`
  - `migration.dir`: `supabase/migrations` → `db/migrations`
  - seed output default: `supabase/seeds` → `db/seeds`
- **Connection string**: `DB_CONNECTION_STRING` is now the primary env var. `SUPABASE_CONNECTION_STRING` and `DATABASE_URL` remain accepted for backward compatibility.
- **postgres:// support**: connection strings starting with `postgres://` (e.g. Cloud SQL) are now accepted in addition to `postgresql://`
- **Package**: removed `@supabase/supabase-js` dependency. Supatool now works with any PostgreSQL database (Cloud SQL, Supabase, RDS, self-hosted).
- **Description updated**: repositioned as a generic PostgreSQL tool, not Supabase-specific.

### Added
- **migrate command**: `supatool migrate` applies pending `db/migrations/*.sql` files to remote DB in alphabetical order. Applied files are tracked in a `_supatool_migrations` table (auto-created). Supports `--dry-run` and `--dir` options.

### Removed
- **sync command** (was already deprecated — use `deploy`)
- **crud command** (Supabase-types CRUD gen — use an LLM instead)
- **gen:crud command** (model YAML CRUD gen — deprecated)
- **gen:all command** (included the above CRUD gen)

## v0.5.0
### Added
- **deploy/sync**: RPC/function diff generation — local `<schema>/rpc/<fn>.sql` files are compared against the remote `pg_get_functiondef`. Changed or new functions generate `CREATE OR REPLACE FUNCTION` migrations automatically
- **deploy/sync**: Table rename detection — when a table exists locally but not remotely, and a remote table with ≥70% column overlap is found, a `RENAME TABLE` migration is generated with a warning to review before applying
- **deploy**: `--rls rewrite` flag — compares local `<schema>/rls/*.sql` against remote `pg_policies` and generates `DROP POLICY IF EXISTS` + `CREATE POLICY` migrations for changed/new/removed policies. Omit the flag to skip RLS (default)
- **config**: `migration.naming` option in `supatool.config.json`: `"sequential"` generates `NNN_description.sql` (incrementing from the highest existing file number), `"timestamp"` (default) keeps the existing `YYYYMMDDHHMMSS_description.sql` format
- **config**: `migration.dir` option to override the migration output directory (default: `supabase/migrations`)
- **config:init**: Auto-creates `.env.local` template and checks `.gitignore`, auto-appending missing entries (`supatool.config.json`, `.env.local`) to prevent accidental secret commits

## v0.4.3
### Changed
- **seed**: `tables.yaml` format changed to schema-grouped (no `tables:` wrapper key)
  ```yaml
  public:
    - users
    - posts
  admin:
    - platforms
  ```
- **seed**: Output now organized into schema subdirectories: `supabase/seeds/<timestamp>/<schema>/<table>_seed.json`
- **seed**: `llms.txt` index paths updated to reflect schema subdirectory structure

### Added
- **seed**: Explicit error when old `tables:` key format is detected, with migration example
- **seed**: Explicit error when dot notation (`admin.table`) is used inside a schema group
- **extract**: Generated columns now output as `GENERATED ALWAYS AS (expr) STORED` in DDL instead of appearing as regular columns with a default value
- **extract**: Overloaded RPC functions (same name, different signatures) are detected and reported as a console warning during extract, listing all signatures

## v0.4.2
### Changed
- **extract**: Removed `fn_` prefix from RPC function filenames (`rpc/get_users.sql` instead of `rpc/fn_get_users.sql`) to prevent LLMs from treating `fn_` as part of the function name

## v0.4.1
### Added
- **extract**: Document RLS status for every table in Tables docs (schema_summary.md, llms.txt OBJECTS, schema_index.json). Shows "RLS disabled", "RLS enabled, policies: 0", or "RLS enabled, policies: N". Tables with RLS enabled but no policies are not warned (intentional use is allowed).
- **extract**: When any table has RLS disabled, write `rls_warnings.md` listing those tables and show a console warning at the end of extract. README.md links to rls_warnings.md when present.

## v0.4.0
### Added
- **extract**: When multiple schemas are specified, output to schema-separated folders: `outputDir/<schema>/tables|views|rpc|...`
- **extract**: Add schema qualification to CREATE TABLE / CREATE VIEW (e.g. `CREATE TABLE public.users`)
- **extract**: Merge table/view definitions with RLS and triggers into a single file per table/view (LLM/human-friendly)
- **TableDefinition**: Add `schema` field (used for output paths and merge grouping)
- **llms.txt**: Add `RELATIONS` section (table-to-table FK list)
- **llms.txt**: Add `RPC_TABLES` section (tables referenced by each RPC, extracted from function DDL)
- **llms.txt**: Add `ALL_SCHEMAS` section (full schema list; marks extracted vs not extracted)
- **Types**: Export `SchemaRelation`, `RpcTableUsage` (for extract integration)
- **Output files**: All extract outputs (README.md, llms.txt, each .sql) now include a one-line header: `Generated by supatool v{VERSION}, {YYYY-MM-DD}`
- **AI / coding agents**: Entry point documented (read `llms.txt` first). Extract now writes `schema_index.json` (same data as llms.txt) and `schema_summary.md` (one-file overview). Seeds `llms.txt` references `../schemas/llms.txt`. OBJECTS lines in llms.txt use ` # comment` for table/view comments.

### Deprecated
- **crud / gen:crud (crud-autogen)**: With LLM development, writing code as needed is often more efficient than auto-generating CRUD. These commands remain available but are deprecated; prefer writing code with an LLM.

### Changed
- **extract**: RLS and triggers are no longer written as separate files; they are appended to the corresponding table/view .sql
- **extract**: Functions, cron, and types remain in separate files (functions are shared across tables)
- **extract**: Replaced `index.md` with `README.md` (human-oriented explanation and link to llms.txt); llms.txt remains the single catalog
- **extract**: With `--force`, the output directory is removed before writing so deleted tables do not leave orphan files
- **Local usage**: Removed postbuild `npm link`; use `npm run local -- ...` or `npm start -- ...` to run without building

## [0.0.1] - 2025-02-09
- Initial version
- Support for dynamic schema name retrieval

## [0.0.2] - 2025-02-18
- Support for CRUD generation for views

## [0.0.3] - 2025-02-19
- Adjust CRUD generation

## [0.0.4] - 2025-03-17
- Output type definitions to shared folder

## [0.1.0-2] - 2025-04-20
- First public release.
- Generate TypeScript CRUD code from Supabase type definitions.
- Support for table filtering with `-t, --tables` option.
- Output folder and import path options.
- Overwrite confirmation with `--force`/`-f`.

## [0.3.0] - 2025-01-XX
### Added
- **Performance Optimization**: Significantly improved table processing speed through parallel query execution
- **Batch Processing**: Implemented concurrent table processing with configurable limits (default: 20, max: 50)
- **Progress Display**: Enhanced UI with animated progress bars, rotating spinners, and real-time updates
- **Environment Variables**: Added `SUPATOOL_MAX_CONCURRENT` for controlling parallel processing limits
- **Comprehensive Error Handling**: Better error reporting and debug logging for failed operations

### Improved
- **Query Performance**: 5x speedup from parallel query execution per table
- **File Operations**: Parallel file writing for faster completion  
- **User Experience**: Smooth, real-time progress updates with Supabase-themed animations
- **English Localization**: All user-facing messages now in English

### Technical
- Query-level parallelization using `Promise.all` for table DDL generation
- Table-level batch processing with configurable concurrency limits
- Optimized progress display with carriage return positioning
- Comprehensive error handling for individual table failures 

## v0.3.5
- Add: `supatool seed` command to export selected table data as AI-friendly seed JSON
- Add: llms.txt (AI seed data index) auto-generated in supabase/seeds/ with each seed export
- Change: llms.txt format improved (table name: file name (xx rows) #comment, with header info)
- Change: CLI help text and documentation simplified and clarified
- Change: README llms.txt example updated to match latest format
- Fix: Output folder for seeds now uses yyyymmdd_hhmm_supatool format
- Other minor improvements and bug fixes 

## v0.3.7
- Unified DDL and sync command constraint output logic
- CHECK constraints are now always output at the end of the DDL
- Constraint output order is now unified as: UNIQUE → FOREIGN KEY → CHECK
- DDL generation in fetchRemoteSchemas.ts is now unified, so all commands output the same DDL
- Removed redundant/duplicate logic for better maintainability and readability

## v0.3.8
### Added
- **deploy command**: `deploy` command to deploy local schema to remote
- `--auto-apply`: Auto-apply to remote (no confirmation)
- `--dry-run`: Preview changes only (recommended)
- `--generate-only`: Generate migration files only (no apply)

### Changed
- **sync command deprecated**: `sync` command is now deprecated
- Use `deploy` command instead

### Deprecation Notice
- Migrate from `supatool sync` → `supatool deploy --table <table-name> --dry-run`
- `sync` command continues to work but shows deprecation warning
