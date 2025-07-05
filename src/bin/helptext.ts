// See: [src/bin/helptext.ts](./src/bin/helptext.ts) from project root
// Help text (command section from README, English only)
export const helpText = `
Supatool CLI - Supabase schema extraction and TypeScript CRUD generation

Usage:
  supatool <command> [options]

Commands:
  extract            Extract database objects from Supabase
  gen:types          Generate TypeScript types from model YAML
  gen:crud           Generate CRUD TypeScript code from model YAML
  gen:docs           Generate Markdown documentation from model YAML
  gen:sql            Generate SQL (tables, relations, RLS/security) from model YAML
  gen:rls            Generate RLS/security SQL from model YAML
  gen:all            Generate all outputs from model YAML
  create             Generate a template model YAML
  crud               Generate CRUD code from Supabase type definitions
  sync               Sync local and remote schemas
  seed               Export selected table data as AI-friendly seed JSON
  config:init        Generate configuration template
  help               Show help

Common Options:
  -c, --connection <string>    Supabase connection string
  -o, --output-dir <path>      Output directory
  -t, --tables <pattern|path>  Table pattern or YAML path
  --schema <schemas>           Target schemas (comma-separated)
  --config <path>              Configuration file path
  -f, --force                  Force overwrite

For details, see the documentation.
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