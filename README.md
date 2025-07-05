# Supatool

A CLI tool that automatically generates TypeScript CRUD code from Supabase type definitions.

## Features
- Extract and categorize all database objects (tables, views, RLS, functions, triggers) from Supabase
- Generate TypeScript CRUD functions from Supabase types or model YAML
- Output human-readable and AI-friendly schema/index files
- Flexible environment/configuration and batch processing
- Simple CLI with help and documentation

> For all new features and version history, see [CHANGELOG.md](./CHANGELOG.md).

## Install

```
npm install -g supatool
# or
yarn global add supatool
# or
pnpm add -g supatool
```

## Usage

### Extract Database Schema

Extract and categorize all database objects from your Supabase project:

```bash
# Set connection string in environment (recommended)
echo "SUPABASE_CONNECTION_STRING=postgresql://..." >> .env.local

# Extract all database objects with AI-friendly index
supatool extract --all -o supabase/schemas

# Extract only tables and views
supatool extract -o supabase/schemas

# Extract specific tables with pattern
supatool extract -t "user_*" -o supabase/schemas

# Extract from specific schemas (comma-separated)
supatool extract --all --schema public,auth,extensions -o supabase/schemas

# Alternative: specify connection directly
supatool extract --all -c "postgresql://..." -o supabase/schemas
```

**Output structure:**
```
supabase/schemas/
├── index.md              # Human-readable index with comments
├── llms.txt              # AI-friendly structured data with comments
├── tables/               # Table definitions with comments
├── views/                # View definitions with comments
├── rls/                  # RLS policies
└── rpc/                  # Functions & triggers
```

### Generate CRUD Code

Generate TypeScript CRUD functions from Supabase types:

```bash
# Generate from Supabase type definitions
supatool crud

# Generate from schema SQL files  
supatool gen:schema-crud --include-views --react-query

# Generate from model YAML
supatool gen:crud model.yaml
```

**Output:** `src/integrations/supabase/crud-autogen/`

### Environment Configuration

For security and convenience, set your connection string in environment variables:

```bash
# Create .env.local file with your connection details
cat > .env.local << EOF
SUPABASE_CONNECTION_STRING=postgresql://user:password@host:port/database
# Alternative: use DATABASE_URL
DATABASE_URL=postgresql://user:password@host:port/database
EOF

# Now you can run commands without -c flag
supatool extract --all -o supabase/schemas
```

**Supported environment variables:**
- `SUPABASE_CONNECTION_STRING` (preferred)
- `DATABASE_URL` (fallback)
- `SUPATOOL_MAX_CONCURRENT` (max concurrent table processing, default: 20, max: 50)

### Additional Commands

```bash
# Show help for all commands
supatool help

# Specify custom input/output paths
supatool crud -i path/to/types -o path/to/output
```

## Database Comments

Supatool automatically extracts and includes PostgreSQL comments in all generated files. Comments enhance documentation and AI understanding of your schema.

- Table, view, function, and type comments are included in generated SQL and documentation.
- AI-friendly index files (llms.txt) and Markdown index (index.md) include comments for better context.

## VSCode/Cursor Integration

Add these tasks to `.vscode/tasks.json` for quick access:

> **Note:** Restart VSCode/Cursor after installing supatool to ensure the command is recognized.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Extract Schema and Generate CRUD",
      "type": "shell",
      "command": "supatool extract --all -o supabase/schemas && supatool gen:schema-crud --react-query",
      "group": "build",
      "dependsOn": "setup-env"
    },
    {
      "label": "setup-env",
      "type": "shell",
      "command": "echo 'Ensure SUPABASE_CONNECTION_STRING is set in .env.local'",
      "group": "build"
    },
    {
      "label": "Generate Types and CRUD (Legacy)",
      "type": "shell", 
      "command": "mkdir -p shared && npx supabase gen types typescript --project-id ${input:projectId} --schema public > shared/types.ts && supatool crud --force",
      "group": "build"
    }
  ],
  "inputs": [
    {
      "id": "projectId", 
      "description": "Supabase project ID",
      "default": "your_project_id"
    }
  ]
}
```

## Example: How to use generated CRUD code in your apps

CRUD utility files for the `apps` table will be generated in `src/integrations/supabase/crud-autogen/` by default.

You can import and use these functions in your application as follows:

```ts
// Example: Using CRUD functions for the apps table (v0.3.0+)
import {
  selectAppsRowsWithFilters,
  selectAppsSingleRowWithFilters,
  selectAppsRowById,
  insertAppsRow,
  updateAppsRow,
  deleteAppsRow,
} from 'src/integrations/supabase/crud-autogen/apps';

// Select multiple rows with filters (NEW: destructuring parameters)
const apps = await selectAppsRowsWithFilters({ filters: { status: 'active' } });

// Select a single row with filters
const app = await selectAppsSingleRowWithFilters({ filters: { id: 'your-app-id' } });

// Select by ID (NEW: destructuring parameters)
const appById = await selectAppsRowById({ id: 'your-app-id' });

// Insert new row (NEW: destructuring parameters)
const newApp = await insertAppsRow({ data: { name: 'New App', status: 'active' } });

// Update row (NEW: destructuring parameters)
const updatedApp = await updateAppsRow({ 
  id: 'your-app-id', 
  data: { name: 'Updated Name' } 
});

// Delete row (NEW: destructuring parameters)
const success = await deleteAppsRow({ id: 'your-app-id' });
```

- All functions are async and return the corresponding row type.
- You can use filter objects for flexible queries.
- See the generated file for each table in `src/integrations/supabase/crud-autogen/` for details.

## Limitations

Currently, the generated code only supports tables where the primary key column is named `id`.
If your table's primary key is not named `id`, the `selectById`, `update`, and `delete` functions will not be generated for that table.

## Repository

For more details, see the project on GitHub: [https://github.com/idea-garage/supatool](https://github.com/idea-garage/supatool)

## Acknowledgements

This project is inspired by and made possible thanks to the amazing work of [Supabase](https://supabase.com/).

## Complete Workflow Examples

### Database-First Development

Extract your existing database schema and generate CRUD code using [Supabase's declarative schema workflow](https://supabase.com/docs/guides/local-development/declarative-database-schemas):

```bash
# 1. Set connection string in .env.local
echo "SUPABASE_CONNECTION_STRING=postgresql://..." >> .env.local

# 2. Extract all database objects to supabase/schemas (declarative schema format)
supatool extract --all -o supabase/schemas

# 3. Generate migrations from declarative schema
supabase db diff -f initial_schema

# 4. Generate TypeScript types with Supabase CLI  
npx supabase gen types typescript --local > src/types/database.ts

# 5. Generate CRUD functions with React Query support
supatool gen:schema-crud --include-views --react-query
```

### Model-First Development

Start from YAML model definitions:

```bash
# 1. Create model definition
supatool create model.yaml

# 2. Generate everything from model
supatool gen:all model.yaml
```

### Extract Command Options

Extract database objects in Supabase declarative schema format:

```bash
# Recommended: Set connection in .env.local first
echo "SUPABASE_CONNECTION_STRING=postgresql://..." >> .env.local

# Extract all database objects to categorized directories (recommended)
supatool extract --all -o supabase/schemas
# Output: supabase/schemas/{index.md,tables/,views/,rls/,rpc/}
# Compatible with: supabase db diff

# Extract only tables and views
supatool extract -o supabase/schemas  
# Output: supabase/schemas/{index.md,tables/,views/}

# Extract to single directory (for simple projects)
supatool extract --no-separate -o supabase/schemas
# Output: supabase/schemas/{index.md,*.sql}

# Extract with pattern matching
supatool extract -t "user_*" -o ./user-tables

# Extract from specific schemas (default: public)
supatool extract --all --schema public,auth,extensions -o supabase/schemas

# Alternative: specify connection directly
supatool extract --all -c "postgresql://..." -o supabase/schemas
```

## Seed Command (v0.3.5+)

Export selected table data from your remote Supabase DB as AI-friendly seed JSON files.

### Usage

```
supatool seed --tables tables.yaml --connection <CONNECTION_STRING>
```

- `tables.yaml` example:
  ```yaml
  tables:
    - users
    - public.orders
  ```
- Output: `supabase/seeds/<timestamp>_supatool/{table}_seed.json`
- Each file contains a snapshot of the remote DB table at the time of export.

### Example output (users_seed.json)
```json
{
  "table": "public.users",
  "fetched_at": "2024-07-05T11:16:00Z",
  "fetched_by": "supatool v0.3.5",
  "note": "This data is a snapshot of the remote DB at the above time. For AI coding reference. You can update it by running the update command again.",
  "rows": [
    { "id": 1, "name": "Taro Yamada", "email": "taro@example.com" },
    { "id": 2, "name": "Hanako Suzuki", "email": "hanako@example.com" }
  ]
}
```

> **Warning:** Do not include sensitive or personal data in seed files. Handle all exported data with care.

### llms.txt (AI seed data index)

After exporting, a file named `llms.txt` is automatically generated (and overwritten) in the `supabase/seeds/` directory. This file lists all seed JSON files in the latest timestamped folder, with table name, fetch time, and row count for AI reference.

- Note: `llms.txt` is not generated inside each timestamped subfolder, only in `supabase/seeds/`.

#### Example llms.txt
```
# AI seed data index (generated by supatool)
# fetched_at: 2024-07-05T11:16:00Z
# folder: 20240705_1116_supatool
public.users: users_seed.json (2 rows) # User account table
public.orders: orders_seed.json (5 rows)
```

## More Information

For full version history and detailed changes, see [CHANGELOG.md](./CHANGELOG.md).