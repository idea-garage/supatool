// See: [src/bin/helptext.ts](./src/bin/helptext.ts) from project root
// Help text (command section from README, English only)
export const helpText = `
Supatool CLI - PostgreSQL schema management (Cloud SQL, Supabase, and any PostgreSQL)

Usage:
  supatool <command> [options]

Commands:
  extract            Extract database objects from remote DB into local files
  deploy             Deploy local schema changes to remote (diff → migration → apply)
  migrate            Apply pending db/migrations/*.sql files to remote DB
  seed               Export table data as AI-friendly seed JSON
  config:init        Generate supatool.config.json and .env.local template
  gen:types          Generate TypeScript types from model YAML
  gen:docs           Generate Markdown documentation from model YAML
  gen:sql            Generate SQL (tables, relations, RLS) from model YAML
  gen:rls            Generate RLS policy SQL from model YAML
  help               Show this help

Common Options:
  -c, --connection <string>    Connection string (postgresql:// or postgres://)
  -o, --output-dir <path>      Output directory
  --schema <schemas>           Target schemas (comma-separated, default: public)
  --config <path>              Configuration file path
  -f, --force                  Force overwrite

Examples:

  # Extract full schema
  supatool extract --all -o db/schemas

  # Multiple schemas and table filter
  supatool extract --schema public,agent -t "user_*" -o db/schemas

  # Deploy (preview first)
  supatool deploy --table users --dry-run
  supatool deploy --table all --dry-run

  # Apply migrations
  supatool migrate --dry-run
  supatool migrate

  # Seed export
  supatool seed --tables tables.yaml -o db/seeds

  # tables.yaml format:
  #   public:
  #     - users
  #     - posts

Connection string is read from (in priority order):
  1. --connection option
  2. DB_CONNECTION_STRING  (.env.local)
  3. SUPABASE_CONNECTION_STRING  (legacy)
  4. DATABASE_URL  (legacy)
  5. supatool.config.json

For details, see https://github.com/idea-garage/supatool
`;

// Model Schema Usage
export const modelSchemaHelp = `
Model Schema Usage (schemas/supatool-data.schema.ts):

- Import in TypeScript:
  import { SUPATOOL_MODEL_SCHEMA } from 'supatool/schemas/supatool-data.schema';

- Validate with ajv:
  import Ajv from 'ajv';
  const ajv = new Ajv();
  const validate = ajv.compile(SUPATOOL_MODEL_SCHEMA);
  const data = /* your YAML/JSON parsed object */;
  if (!validate(data)) {
    console.error(validate.errors);
  } else {
    console.log('Valid!');
  }
`;
