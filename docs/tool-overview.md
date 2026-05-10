# Supatool overview

CLI for PostgreSQL schema extraction, migration, seed export, and deploy. Works with Cloud SQL, Supabase, and any PostgreSQL database. See the [README](../README.md) for basic usage.

## Features

- **extract** – Dump tables, views, RLS, functions, triggers from the DB into local files. Outputs `llms.txt` as a catalog for AI/agents.
- **deploy** – Push local schema diff to remote (use `--dry-run` to preview). Generates migration files in `db/migrations/`.
- **migrate** – Apply pending `db/migrations/*.sql` files to remote. Tracks applied migrations in `_supatool_migrations` table.
- **seed** – Export selected table data as JSON. Writes an `llms.txt` index under `db/seeds/`.
- **gen:*** – Generate SQL, types, RLS, docs from YAML/JSON models.

## Use cases

- Keep PostgreSQL schema in files and feed them to LLMs or agents.
- Export table data as seed JSON for AI-assisted coding.
- Deploy DDL edited locally to remote.
- Apply migration files to Cloud SQL or any PostgreSQL DB.

## Command examples

```sh
# Extract full schema
supatool extract --all -o db/schemas

# Multiple schemas and table filter
supatool extract --schema public,agent -t "user_*" -o db/schemas

# Deploy (dry run, then apply)
supatool deploy --table users --dry-run
supatool deploy --table users

# Apply pending migrations
supatool migrate --dry-run
supatool migrate

# Seed export
supatool seed --tables tables.yaml -o db/seeds
```

From a YAML model:

```sh
supatool gen:types path/to/model.yaml
supatool gen:sql path/to/model.yaml
supatool gen:rls path/to/model.yaml
supatool gen:docs path/to/model.yaml
```

## Related docs

- [tool-design.md](./tool-design.md) – Design and seed spec
