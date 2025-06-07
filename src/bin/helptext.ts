// See: [src/bin/helptext.ts](./src/bin/helptext.ts) from project root
// Help text (command section from README, English only)
export const helpText = `
Supatool CLI - Supabase database schema extraction and TypeScript CRUD generation

Usage:
  supatool <command> [options]

Commands:
  extract            Extract and categorize database objects from Supabase
  gen:schema-crud    Generate CRUD code from supabase/schemas SQL files
  crud               Generate CRUD code from Supabase type definitions
  gen:types          Generate TypeScript types from model YAML
  gen:crud           Generate CRUD TypeScript code from model YAML
  gen:docs           Generate Markdown documentation from model YAML
  gen:sql            Generate SQL (tables, relations, RLS/security) from model YAML
  gen:rls            Generate RLS/security SQL from model YAML
  gen:all            Generate all outputs from model YAML
  create             Generate a template model YAML
  config:init        Generate configuration template
  help               Show help

Extract Options:
  -c, --connection <string>    Supabase connection string
  -o, --output-dir <path>      Output directory (default: ./supabase/schemas)
  -t, --tables <pattern>       Table pattern with wildcards (default: *)
  --tables-only                Extract only table definitions
  --views-only                 Extract only view definitions
  --all                        Extract all DB objects (tables, views, RLS, functions, triggers, cron, types)
  --no-separate                Output all objects in same directory
  --schema <schemas>           Target schemas, comma-separated (default: public)

Examples:
  # Set connection in .env.local (recommended)
  echo "SUPABASE_CONNECTION_STRING=postgresql://..." >> .env.local
  
  # Extract all database objects with AI-friendly index
  supatool extract --all -o supabase/schemas
  # Output:
  #   supabase/schemas/index.md (Human-readable index with table/view comments)
  #   supabase/schemas/llms.txt (AI-friendly structured data with comments)
  #   supabase/schemas/tables/*.sql (Tables with comments)
  #   supabase/schemas/views/*.sql (Views with comments)
  #   supabase/schemas/rls/*.sql (RLS policies)
  #   supabase/schemas/rpc/*.sql (Functions & triggers)
  #   supabase/schemas/cron/*.sql (Cron jobs)
  #   supabase/schemas/types/*.sql (Custom types)

  # Extract only tables and views (default)
  supatool extract -o supabase/schemas

  # Extract to single directory (legacy mode)
  supatool extract --no-separate -o supabase/schemas

  # Extract specific pattern
  supatool extract -t "user_*" -o ./user-tables

  # Extract from specific schemas (default: public)
  supatool extract --all --schema public,auth,extensions -o supabase/schemas

  # Alternative: specify connection directly
  supatool extract --all -c "postgresql://..." -o supabase/schemas

  # Complete database-first workflow
  echo "SUPABASE_CONNECTION_STRING=postgresql://..." >> .env.local
  supatool extract --all -o supabase/schemas
  supatool gen:schema-crud --include-views --react-query

  # Model-first workflow
  supatool create model.yaml
  supatool gen:all model.yaml

  # Legacy CRUD generation
  supatool crud

Database Comments:
  Supatool automatically extracts and includes database comments in generated files.
  
  To add comments to your database objects:
  
  # Table comments
  COMMENT ON TABLE users IS 'User account information';eha,
  
  # View comments
  COMMENT ON VIEW user_profiles IS 'Combined user data with profile information';
  
  # Function comments
  COMMENT ON FUNCTION update_timestamp() IS 'Automatically updates the updated_at column';
  
  # Custom type comments
  COMMENT ON TYPE user_status IS 'Enumeration of possible user account statuses';
  
  Comments will appear in:
  - index.md: Human-readable list with descriptions (tables/views only)
  - llms.txt: AI-friendly format (type:name:path:comment)
  - Generated SQL files: As COMMENT statements
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

- Use with AI:
  const schemaJson = JSON.stringify(SUPATOOL_MODEL_SCHEMA, null, 2);
  // Pass schemaJson to your AI prompt or API
`; 