// See: [src/bin/helptext.ts](./src/bin/helptext.ts) from project root
// Help text (command section from README, English only)
export const helpText = `
Supatool CLI - Generate TypeScript CRUD code from Supabase type definitions

Usage:
  supatool <command> [options]

Commands:
  crud           Generate CRUD code from Supabase type definitions
  gen:types      Generate TypeScript types from model YAML
  gen:crud       Generate CRUD TypeScript code from model YAML
  gen:docs       Generate Markdown documentation from model YAML
  gen:sql        Generate SQL (tables, relations, RLS/security) from model YAML
  gen:rls        Generate RLS/security SQL from model YAML
  gen:all        Generate all outputs from model YAML
  create         Generate a template model YAML
  help           Show help

Options:
  -i, --input <path>   Input folder for type definitions (default: shared/)
  -o, --output <path>  Output folder for generated code (default: src/integrations/supabase/)
  -t, --tables <names>  Generate code for specific tables only (comma separated, e.g. table1,table2)
  -f, --force           Overwrite output folder without confirmation
  -h, --help            Show help
  -V, --version         Show version

Examples:
  supatool crud
  supatool gen:types model.yaml -o docs/generated/
  supatool gen:crud model.yaml -o docs/generated/crud/
  supatool gen:all model.yaml -o docs/generated/
  supatool create simple -o docs/model-schema-example.yaml
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