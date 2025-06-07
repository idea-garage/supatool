# supabase-schema-sync

Synchronize Supabase/Postgres schemas between remote DB and local `schemas/*.sql` files, tracking per-table timestamps.

## Features

✅ Full sync all tables  
✅ Sync specific table(s) by name or wildcard  
✅ Per-table `-- schema-synced-at` timestamp  
✅ Safe diff & skip unchanged tables  

## Usage

```bash
# Build first
npm run build

# Full sync (pull/push as needed)
supabase-schema-sync --connection postgresql://... --schemaDir ./schemas

# Sync specific table
supabase-schema-sync --connection postgresql://... --schemaDir ./schemas --table users

# Sync wildcard
supabase-schema-sync --connection postgresql://... --schemaDir ./schemas --table user*
```