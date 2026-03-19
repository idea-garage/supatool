# Supatool

**The AI-Native Schema Management CLI for Supabase.** Extract database schemas into LLM-friendly structures, generate `llms.txt` catalogs, and manage seeds without drowning your AI's context.

[![npm version](https://img.shields.io/npm/v/supatool.svg)](https://www.npmjs.com/package/supatool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why Supatool?

Modern AI coding tools (Cursor, Claude, MCP) often struggle with large database schemas. Typical issues include:
- **Token Waste:** Reading the entire schema at once consumes 10k+ tokens.
- **Lost Context:** Frequent API calls to fetch table details via MCP lead to fragmented reasoning.
- **Inaccuracy:** AI misses RLS policies or complex FK relations split across multiple files.

**Supatool solves this** by reorganizing your Supabase schema into a highly searchable, indexed, and modular structure that helps AI "understand" your DB with minimal tokens.

---

## Key Features

- **Extract (AI-Optimized)** – DDL, RLS, and Triggers are bundled into **one file per table**. AI gets the full picture of a table by opening just one file.
- **llms.txt Catalog** – Automatically generates a standard `llms.txt` listing all OBJECTS, RELATIONS (FKs), and RPC dependencies. This serves as the "Map" for AI agents.
- **Multi-Schema Support** – Group objects by schema (e.g., `public`, `agent`, `auth`) with proper schema-qualification in SQL.
- **Seed for AI** – Export table data as JSON. Includes a dedicated `llms.txt` for seeds so AI can see real data structures.
- **Safe Deploy** – Push local schema changes with `--dry-run` to preview DDL before execution.
- **CRUD (Deprecated)** – Legacy code generation is still available but discouraged in favor of LLM-native development.

---

## Quick Start

```bash
npm install -g supatool
# Set your connection string
export SUPABASE_CONNECTION_STRING="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# Extract schema and generate AI-ready docs
supatool extract --schema public,auth -o supabase/schemas

```

### Output Structure

```text
supabase/schemas/
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

To get the best results from your AI coding assistant, follow these steps:

1. **Start with the Map:** Always ask the AI to read `supabase/schemas/llms.txt` first.
2. **Targeted Reading:** Once the AI identifies the relevant tables from the catalog, instruct it to open only those specific `.sql` files.
3. **Understand Relations:** Use the `RELATIONS` section in `llms.txt` to help the AI write accurate JOINs without reading every file.
4. **RPC Context:** If using functions, refer to `RPC_TABLES` in `llms.txt` to know which tables are affected.

---

## Commands

### Extract

```bash
supatool extract --all -o supabase/schemas
# Options:
# --schema public,agent   Specify schemas
# -t "user_*"             Filter tables by pattern
# --force                 Clear output dir before writing (prevents orphan files)

```

### Seed

Export specific tables for AI reference or testing:

```bash
supatool seed --tables tables.yaml

```

*Outputs JSON files and a `llms.txt` index in `supabase/seeds/`.*

### Deploy

```bash
supatool deploy --dry-run

```

---

## Repository

[GitHub](https://github.com/idea-garage/supatool) · [npm](https://www.npmjs.com/package/supatool)

---

*Developed with ❤️ for the Supabase community. Use at your own risk. Always backup your DB before deployment.*
