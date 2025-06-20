# Supatool

A CLI tool that automatically generates TypeScript CRUD code from Supabase type definitions.


## Install

```
npm install -g supatool
# or
yarn global add supatool
# or
pnpm add -g supatool
```

## Usage

### 1. Extract Database Schema (NEW in v0.3.0)

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

### 2. Generate CRUD Code

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

### 3. Environment Configuration

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

### 4. Additional Commands

```bash
# Show help for all commands
supatool help

# Specify custom input/output paths
supatool crud -i path/to/types -o path/to/output
```

## Note: Supabase Client Requirement

The generated CRUD code assumes that a Supabase client is defined in ../client.ts (relative to the export folder).
Example:

```ts
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')
```

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

## New Features (v0.3.0)

- **🔍 Schema Extraction**: Extract and categorize all database objects (tables, views, RLS, functions, triggers)
- **📋 Supabase Declarative Schema**: Fully compliant with [Supabase's declarative database schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas) workflow
- **🤖 AI-Friendly Index**: Auto-generated index.md and llms.txt files for better AI understanding of schema structure  
- **💬 Comment Support**: Automatically extracts and includes database comments in generated files
- **📁 Organized Output**: Separate directories for different object types with flexible organization options
- **🎯 Pattern Matching**: Extract specific tables/views using wildcard patterns
- **👁️ View Support**: Enhanced CRUD generation with SELECT-only operations for database views
- **⚛️ React Query Integration**: Generate modern React hooks for data fetching
- **🔧 Flexible Workflows**: Support both database-first and model-first development approaches

## Changelog

### v0.3.4

- **FIXED**: Corrected RLS policy to proper format
- **FIXED**: Ensured semicolon (;) is properly appended to function definitions
- **FIXED**: Removed trailing whitespace from RLS template files

### v0.3.3

- **ENHANCED**: Improved SQL comment placement (moved to end of each SQL statement)
- **ENHANCED**: Unified comment format for tables, views, functions, and custom types
- **FIXED**: Preserved view `security_invoker` settings

### v0.3.2

- **ENHANCED**: Adjust for extensions(vector, geometry etc.)
- **FIXED**: USER-DEFINED column types are now rendered with full type definitions (e.g. `vector(1536)`, `geometry(Point,4326)`).
- **ADDED**: `FOREIGN KEY` constraints are now included as `CONSTRAINT ... FOREIGN KEY ... REFERENCES ...` inside generated `CREATE TABLE` statements.

### v0.3.0

**NEW Features:**
- **NEW**: `extract` command for database schema extraction
- **NEW**: Full compliance with Supabase declarative database schemas workflow
- **NEW**: AI-friendly index.md and llms.txt generation for better schema understanding
- **NEW**: Database comment extraction and integration
- **NEW**: Organized directory structure (tables/, views/, rls/, rpc/)
- **NEW**: Pattern matching for selective extraction
- **ENHANCED**: Support for all database object types (RLS, functions, triggers, cron jobs, custom types)
- **ENHANCED**: Flexible output options with --no-separate compatibility

**Enhanced Error Handling:**
- Comprehensive try-catch blocks for all CRUD operations
- Enhanced null/undefined checks with proper fallbacks
- Detailed error messages with contextual information
- Special handling for PGRST116 errors (record not found)
- Parameter validation for required fields
- Proper error logging and debugging support

**Breaking Changes:**
- **Function Parameter Format**: All CRUD functions now use destructuring assignment
  - Before: `selectTableRowById(id: string)`
  - After: `selectTableRowById({ id }: { id: string })`
- **Type Safety**: Enhanced TypeScript type annotations for all functions

### v0.2.0
- Added `gen:` commands for code and schema generation
- Enhanced `create` command  
- Introduced model schema support (`schemas/supatool-data.schema.ts`)

## Database Comments

Supatool automatically extracts and includes PostgreSQL comments in all generated files. Comments enhance documentation and AI understanding of your schema.

### Adding Comments to Your Database

```sql
-- Table comments
COMMENT ON TABLE users IS 'User account information and authentication data';

-- View comments
COMMENT ON VIEW user_profiles IS 'Combined user data with profile information';

-- Function comments
COMMENT ON FUNCTION update_timestamp() IS 'Automatically updates the updated_at column';

-- Custom type comments
COMMENT ON TYPE user_status IS 'Enumeration of possible user account statuses';
```

### Comment Integration

Comments appear in:
- **index.md**: Human-readable file listings with descriptions (tables/views only)
- **llms.txt**: AI-friendly format (`type:name:path:comment`)
- **Generated SQL**: As `COMMENT ON` statements for full schema recreation

**Example output:**
```markdown
## Tables
- [users](tables/users.sql) - User account information and authentication data
- [posts](tables/posts.sql) - User-generated content and blog posts
```