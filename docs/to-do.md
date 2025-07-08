# v0.3.7
- TableのCheck制約へ対応

# v0.3.6
- [x] Support for multiple schemas in type definitions
- [x] Generate CRUD files in separate folders by schema (e.g., `crud-autogen/public/`, `crud-autogen/admin/`)
- [x] Use `.schema(schema).from(table)` format for Supabase queries instead of `.from(schema.table)`
- [x] Dynamically adjust import paths: `../../client` when schema folders exist, `../client` when not
- [x] Fix template literal issues in CRUD generation by using array-based string construction
- [x] Add comments to generated CRUD functions

# v0.3.4
- [x] RLSポリシーの`TO {public}`を正しく`TO public`に修正
- [x] 関数定義の末尾にセミコロン（;）を確実に付与
- [x] RLSテンプレートファイルの末尾空白除去

# v0.3.2
- [x] vector(1536) などの列がUSER-DEFINED になってしまうため、vector列に修正
- [x] PK, unique を列定義に付与
- [x] constraint をテーブルSQLの末尾に付与する FK, 複合unique など
