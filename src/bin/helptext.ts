// See: [src/bin/helptext.ts](./src/bin/helptext.ts) from project root
// Help text (command section from README, English only)
export const helpText = `
Supatool CLI - Generate TypeScript CRUD code from Supabase type definitions

Usage:
  supatool crud [options]
  supatool help

Commands:
  crud    Generate CRUD code
  help    Show help

Options:
  -i, --import <path>   Import path for type definitions (default: shared/)
  -e, --export <path>   Output path for CRUD code (default: src/integrations/supabase/)
  -t, --tables <names>  Generate code for specific tables only (comma separated, e.g. table1,table2)
  -f, --force           Overwrite output folder without confirmation
  -h, --help            Show help
  -V, --version         Show version

Examples:
  supatool crud
    - Import path: shared/
    - Export path: src/integrations/supabase/

  supatool crud -i path/to/import -e path/to/export
    - Import path: path/to/import
    - Export path: path/to/export

  supatool crud -t users,posts
    - Only generate for users and posts tables
`; 