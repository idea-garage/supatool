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
npx supabase gen types typescript --project-id "your-project-id" --schema public > shared/types.ts
```

2. Auto-generate CRUD code

```
supatool
```
- Output: `src/integrations/supabase/crud-autogen/`

## Commands & Options

See the help command for all available commands and options:

```
supatool help
```

## License

MIT 