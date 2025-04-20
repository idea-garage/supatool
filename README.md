# Supatool

Supabase型定義からTypeScriptのCRUDコードを自動生成するCLIツール

## インストール

```
npm install -g supatool
# または
yarn global add supatool
# または
pnpm add -g supatool
```

## 使い方

1. Supabase型定義ファイルを生成

```
npx supabase gen types typescript --project-id "your-project-id" --schema public > shared/types.ts
```

2. CRUDコード自動生成

```
supatool
```

- `src/integrations/supabase/crud-autogen/` にCRUDコードが出力されます

## コマンド

```
supatool
```

## コマンド引数

- `-i` インポートパス（型定義ファイルのディレクトリ）
- `-e` エクスポートパス（CRUDコード出力先ディレクトリ）

### 例

#### 引数なし（デフォルト）
```
supatool
```
- インポートパス: `shared/`
- エクスポートパス: `src/integrations/supabase/`

#### オプション指定
```
supatool -i path/to/import -e path/to/export
```
- インポートパス: `path/to/import`
- エクスポートパス: `path/to/export`

## ライセンス

MIT 