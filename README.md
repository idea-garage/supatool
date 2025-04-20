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