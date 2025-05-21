# @docs機能 タスクリスト（設計準拠・コード生成重点）

## 1. 仕様・要件整理
- [x] YAML/JSON/TypeScript型定義から「テーブル定義」「リレーション」「RLS」「API仕様」などの自動生成要件を整理
- [x] 出力フォーマット（TypeScript, SQL, Markdown, OpenAPI等）を決定

## 2. データモデルパース
- [x] YAML/JSON/TypeScript型のパース共通化（parser/配下に実装）
- [x] モデル構造（fields, relations, security, label, description等）をTypeScript型で表現

## 3. コード生成ロジック
- [x] TypeScript型定義ファイル自動生成（gen:types）
- [x] CRUD関数TypeScriptコード自動生成（gen:crud）
- [x] テーブル定義SQL（CREATE TABLE等）自動生成（gen:sql）
- [x] リレーション（外部キー等）SQL自動生成（gen:sql）
- [x] RLS/セキュリティポリシーTypeScript/SQLコード自動生成（gen:rls）
- [ ] API仕様書（OpenAPI/Markdown）自動生成（gen:docs, gen:openapi など）
- [ ] UI自動生成用メタデータ出力（label/description等）
- [ ] テンプレートYAML雛形生成（supatool create <template>）

## 4. ドキュメント生成ロジック
- [x] テーブル定義書（Markdown）自動生成（gen:docs）
- [x] リレーション一覧（Markdown）自動生成（gen:docs）

## 5. CLI/コア設計
- [x] `supatool gen:types` 型定義生成
- [x] `supatool gen:crud` CRUDコード生成
- [x] `supatool gen:sql` テーブル・リレーションSQL+RLS一括生成
- [x] `supatool gen:rls` RLS/セキュリティポリシーコード生成
- [x] `supatool gen:docs` ドキュメント生成
- [x] `supatool gen:all` 一括生成
- [ ] `supatool create <template>` テンプレート雛形生成

## 6. テンプレート・拡張性
- [ ] templates/配下にTypeScript/SQL/Markdown/OpenAPI/YAML等のテンプレートを用意
- [ ] テンプレート差し替え・拡張に対応

## 7. 出力・保存
- [x] docs/generated/配下に自動生成ファイルを保存

## 8. テスト・バリデーション
- [ ] Jest等でユニットテスト（80%以上カバー）
- [ ] CLIからのE2Eテスト

## 9. ドキュメント・サンプル
- [ ] README.mdに使い方・例を追記
- [ ] サンプルモデル・出力例をdocs/に追加

## 10. モデル・テンプレート拡張・設計方針
- [ ] Supabase組み込みauth.usersテーブル等に「作成不要」フラグ（skipCreate等）をモデル定義でサポート
- [ ] テーブル定義書（Markdown等）で主キー情報を明示
- [ ] skeleton, todo, project等テンプレートごとに雛形モデル構造を整理
- [ ] グラフ理論（ノード・エッジ型モデル）拡張方針をドキュメント化
