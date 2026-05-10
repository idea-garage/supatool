# Supatool

**Schema Management CLI for PostgreSQL.** Works with Cloud SQL, Supabase, and any PostgreSQL database. Extract schemas into LLM-friendly structures, deploy diffs, apply migrations, and export seeds.

[![npm version](https://img.shields.io/npm/v/supatool.svg)](https://www.npmjs.com/package/supatool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why Supatool?

Modern AI coding tools (Cursor, Claude, MCP) often struggle with large database schemas. Typical issues include:
- **Token Waste:** Reading the entire schema at once consumes 10k+ tokens.
- **Lost Context:** Frequent API calls to fetch table details lead to fragmented reasoning.
- **Inaccuracy:** AI misses RLS policies or complex FK relations split across multiple files.

**Supatool solves this** by reorganizing your schema into a highly searchable, indexed, and modular structure that helps AI "understand" your DB with minimal tokens.

---

## Supported Databases

Any **PostgreSQL** database:

- Google Cloud SQL (PostgreSQL)
- Supabase
- Amazon RDS (PostgreSQL)
- Self-hosted PostgreSQL

Connection strings in both `postgresql://` and `postgres://` formats are accepted.

---

## Key Features

- **Extract (AI-Optimized)** – DDL, RLS, and Triggers are bundled into **one file per table**. AI gets the full picture of a table by opening just one file.
- **llms.txt Catalog** – Automatically generates a standard `llms.txt` listing all OBJECTS, RELATIONS (FKs), and RPC dependencies. This serves as the "Map" for AI agents.
- **Multi-Schema Support** – Group objects by schema (e.g., `public`, `agent`, `auth`) with proper schema-qualification in SQL.
- **Migrate** – Apply pending `db/migrations/*.sql` files to remote, with tracking and transaction safety.
- **Seed for AI** – Export table data as JSON. Includes a dedicated `llms.txt` for seeds so AI can see real data structures.
- **Safe Deploy** – Push local schema changes with `--dry-run` to preview DDL before execution.

---

## Quick Start

```bash
npm install -g supatool

# Set connection string in .env.local
echo 'DB_CONNECTION_STRING=postgresql://user:password@host:5432/dbname' > .env.local

# Generate config
supatool config:init

# Extract schema and generate AI-ready docs
supatool extract --all -o db/schemas
```

### Output Structure

```text
db/schemas/
├── llms.txt          # 🗺️ THE ENTRY POINT: Read this first to understand the DB map
├── schema_index.json # 🤖 For JSON-parsing agents
├── schema_summary.md # 📄 Single-file overview for quick human/AI scanning
├── README.md         # Navigation guide
└── [schema_name]/
    ├── tables/       # table_name.sql (DDL + RLS + Triggers)
    ├── views/
    └── rpc/
```

---

## Best Practices for AI Agents (Cursor / Claude / MCP)

1. **Start with the Map:** Always ask the AI to read `db/schemas/llms.txt` first.
2. **Targeted Reading:** Once the AI identifies the relevant tables, instruct it to open only those specific `.sql` files.
3. **Understand Relations:** Use the `RELATIONS` section in `llms.txt` to help the AI write accurate JOINs.
4. **RPC Context:** If using functions, refer to `RPC_TABLES` in `llms.txt` to know which tables are affected.

---

## Commands

### Extract

Pull schema from remote DB into local files:

```bash
supatool extract --all -o db/schemas
# Options:
# --schema public,agent   Specify schemas
# -t "user_*"             Filter tables by pattern
# --force                 Clear output dir before writing
```

### Deploy

Push local schema changes to remote (diff → migration → apply):

```bash
supatool deploy --table users --dry-run   # preview
supatool deploy --table all --dry-run     # all tables
supatool deploy --table users             # confirm before apply
```

### Migrate

Apply pending SQL files from `db/migrations/` to remote:

```bash
supatool migrate                    # apply pending migrations
supatool migrate --dry-run          # preview only
supatool migrate -d path/to/dir     # custom directory
```

Migration files are applied in alphabetical order. Applied files are tracked in a `_supatool_migrations` table (auto-created).

### Seed

Export table data as JSON for AI reference or testing:

```bash
supatool seed --tables tables.yaml

# tables.yaml format:
# public:
#   - users
#   - posts
```

*Outputs JSON files and a `llms.txt` index in `db/seeds/`.*

### Config

```bash
supatool config:init    # generate supatool.config.json + .env.local template
```

---

## Configuration

`supatool.config.json`:

```json
{
  "schemaDir": "./db/schemas",
  "tablePattern": "*",
  "migration": {
    "naming": "timestamp",
    "dir": "db/migrations"
  }
}
```

`.env.local` (never commit):

```
DB_CONNECTION_STRING=postgresql://user:password@host:5432/dbname
```

Legacy env vars are also accepted: `SUPABASE_CONNECTION_STRING`, `DATABASE_URL`.

---

## Repository

[GitHub](https://github.com/idea-garage/supatool) · [npm](https://www.npmjs.com/package/supatool)

---

*Works with any PostgreSQL database. Always backup your DB before deployment.*
