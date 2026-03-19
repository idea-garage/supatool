# Supatool overview

CLI for Supabase schema extraction, seed export, and deploy. See the [README](../README.md) for basic usage.

## Features

- **extract** – Dump tables, views, RLS, functions, triggers from the DB into files. Outputs `llms.txt` as a catalog for AI/agents.
- **seed** – Export selected table data as JSON. Writes an `llms.txt` index under `supabase/seeds/`.
- **deploy** – Push local schema to remote (use `--dry-run` to preview).
- **gen:*** – Generate SQL, types, CRUD, RLS, docs from YAML/JSON models (CRUD generation is deprecated; prefer writing code with an LLM).

## Use cases

- Keep Supabase schema in files and feed them to LLMs or agents.
- Export table data as seed JSON for AI-assisted coding.
- Deploy DDL edited locally to remote.

## Command examples

```sh
# Extract full schema
supatool extract --all -o supabase/schemas

# Multiple schemas and table filter
supatool extract --schema public,agent -t "user_*" -o supabase/schemas

# Seed export
supatool seed --tables tables.yaml

# Deploy (dry run)
supatool deploy --dry-run
```

From a YAML model (gen:types, gen:crud are deprecated):

```sh
supatool gen:types path/to/model.yaml
supatool gen:sql path/to/model.yaml
supatool gen:rls path/to/model.yaml
supatool gen:docs path/to/model.yaml
supatool gen:all path/to/model.yaml
```

## Use from TypeScript

Core functionality is available as a TypeScript module.

```ts
import { parseModel, generateSQL } from 'supatool';
```

## Related docs

- [tool-design.md](./tool-design.md) – Design and seed spec
