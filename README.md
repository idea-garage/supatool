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
supatool
```
- Output: `src/integrations/supabase/crud-autogen/`

3. Subcommands

See: [src/bin/helptext.ts](./src/bin/helptext.ts)

For details on how to specify input/output folders, please refer to this as well.

## VSCode/Cursor: Run Supabase CLI and supatool together

You can add a task to `.vscode/tasks.json` to run both commands at once:

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

## Example: How to use generated CRUD code in your app

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