# Supatool 概要

Supatoolは、YAML/JSON/TypeScript型定義からPostgreSQL用SQL・RLS・Supabase用CRUD TypeScriptコード、API仕様書を自動生成するCLIツールです。

## 主な特徴
- テンプレートYAMLからプロジェクト雛形を即生成（supatool create <template>）
- データモデルをYAML/JSON/TypeScriptで記述
- テーブル・リレーション・RLSポリシーのSQL自動生成
- Supabase用型付きCRUD関数のTypeScriptコード自動生成
- API仕様書（OpenAPI/Markdown）自動生成
- CLIコマンドで簡単操作
- 拡張性・汎用性重視

## 想定ユースケース
- Supabaseプロジェクトの初期設計・自動化
- DBスキーマとアプリコードの一貫性維持
- モデル駆動開発（MDD）

## バージョン
- ver0.1 supabase types.tsからのsupabase-js CRUDコード自動生成

## コマンド例
```sh
# テンプレートYAML雛形を生成
supatool create simple
supatool create saas
supatool create blog

# 型定義(TypeScript)生成
supatool gen:types docs/model-schema-example.yaml

# CRUD関数(TypeScript)生成
supatool gen:crud docs/model-schema-example.yaml

# テーブル・リレーションSQL生成
supatool gen:sql docs/model-schema-example.yaml

# RLS/セキュリティポリシーSQL生成
supatool gen:rls docs/model-schema-example.yaml

# ドキュメント(Markdown)生成
supatool gen:docs docs/model-schema-example.yaml

# すべて一括生成
supatool gen:all docs/model-schema-example.yaml
```


---

## 他アプリ（TypeScript）からの利用

Supatoolのコア機能はTypeScriptモジュールとしても利用可能です。
CLIだけでなく、モノレポ内の他アプリやスクリプトから直接呼び出せます。

```typescript
import { parseModel, generateSQL } from 'supatool/src';

const model = parseModel('model.yaml');
const sql = generateSQL(model);
```

---

## 今後の拡張
- ER図自動生成
- UI/ドキュメント自動生成
- API仕様書生成の拡張
- プラグインによる機能追加
- Supabase組み込みauth.usersテーブル等は「作成不要」フラグ（skipCreate等）で管理
- テーブル定義書（Markdown等）で主キー情報を明示
- skeleton, todo, project等テンプレートごとに雛形モデル構造を整理
- グラフ理論（ノード・エッジ型モデル）拡張方針を今後の拡張に追加 