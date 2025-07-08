# Changelog

## [v0.3.6] - 2024-12-19

### Added
- **Multi-schema support**: Now supports multiple schemas in type definitions (e.g., `admin` and `public` schemas)
- **Schema-based folder structure**: CRUD files are now generated in separate folders by schema
  - Example: `crud-autogen/public/users.ts`, `crud-autogen/admin/workspaceLogs.ts`
- **Japanese comments**: Added Japanese comments to all generated CRUD functions for better readability

### Changed
- **Supabase query format**: Updated to use `.schema(schema).from(table)` instead of `.from(schema.table)`
- **Import path handling**: Dynamic import path adjustment based on folder structure
  - Uses `../../client` when schema folders exist
  - Uses `../client` when no schema folders
- **Template generation**: Replaced problematic template literals with array-based string construction for better reliability

### Fixed
- **Template literal issues**: Resolved TypeScript compilation errors caused by nested template literals
- **Type parsing**: Fixed type extraction to handle all schemas within Database type definition
- **CRUD generation**: Ensured all tables and views from all schemas are properly processed

### Technical Details
- Modified `src/index.ts` to parse Database type structure correctly
- Updated CRUD template function to handle schema information
- Implemented dynamic folder creation based on schema names
- Added proper error handling for type parsing

## [v0.3.4] - Previous

### Fixed
- RLS policy `TO {public}` corrected to `TO public`
- Ensured semicolons are added to function definitions
- Removed trailing whitespace from RLS template files

## [v0.3.2] - Previous

### Fixed
- Vector columns like `vector(1536)` now properly recognized instead of USER-DEFINED
- Added PK and unique constraints to column definitions
- Added constraint definitions (FK, composite unique) to table SQL 