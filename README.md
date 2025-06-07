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

1. Generate Supabase type definition file

```
npx supabase gen types typescript --project-id your_project_ref --schema public > shared/types.ts
```

2. Auto-generate CRUD code

```
supatool crud
```
- Output: `src/integrations/supabase/crud-autogen/`

3. Subcommands

For more extensible usage, execute with subcommands:

- Show help text for all commands:
  ```sh
  supatool help
  ```

- Specify input and output folder:
  ```sh
  supatool -i path/to/input -o path/to/output
  ```

For detailed usage, see:
- [src/bin/helptext.ts](./src/bin/helptext.ts) (for development)
- [dist/bin/helptext.js](./dist/bin/helptext.js) (for npm package)

## Note: Supabase Client Requirement

The generated CRUD code assumes that a Supabase client is defined in ../client.ts (relative to the export folder).
Example:

```ts
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')
```

## VSCode/Cursor: Run Supabase CLI and supatool together

You can add a task to `.vscode/tasks.json` to run both commands at once:

> **Note:**
> After installing supatool, please restart VSCode (or your terminal) before using the task, so that the new command is recognized.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate Supabase types and CRUD",
      "type": "shell",
      "command": "mkdir -p shared && npx supabase gen types typescript --project-id your_project_id --schema public > shared/types.ts && supatool crud --force",
      "group": "build"
    }
  ]
}
```

## Example: How to use generated CRUD code in your apps

CRUD utility files for the `apps` table will be generated in `src/integrations/supabase/crud-autogen/` by default.

You can import and use these functions in your application as follows:

```ts
// Example: Using CRUD functions for the apps table
import {
  selectAppsRowsWithFilters,
  selectAppsSingleRowWithFilters,
  selectAppsRowById,
  insertAppsRow,
  updateAppsRow,
  deleteAppsRow,
} from 'src/integrations/supabase/crud-autogen/apps';

// Get multiple rows with filters
const apps = await selectAppsRowsWithFilters({ status: 'active' });

// Get a single row with filters
const app = await selectAppsSingleRowWithFilters({ id: 'your-app-id' });

// Get by ID
const appById = await selectAppsRowById('your-app-id');

// Create new row
const newApp = await insertAppsRow({ name: 'New App', status: 'active' });

// Update row
const updatedApp = await updateAppsRow({ id: 'your-app-id', name: 'Updated Name' });

// Delete row
const deletedApp = await deleteAppsRow('your-app-id');
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

## New Features

- Added skipCreate flag for built-in tables like Supabase's auth.users
- Primary key information can now be explicitly defined in table definition documents (Markdown, etc.)
- Template model structures organized for skeleton, todo, project, and other templates
- Graph theory (node/edge model) extension policy added for future expansion

## Changelog

### v0.2.0
- Added `gen:` commands for code and schema generation
- Enhanced `create` command
- Introduced model schema support (`schemas/supatool-data.schema.ts`)