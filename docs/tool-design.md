# Supatool 詳細設計

## 1. ディレクトリ構成（例）
```
supatool/
  bin/            # CLIエントリポイント
  src/            # コアロジック
    parser/       # YAML/JSON/TS型パーサ
    generator/    # SQL/CRUD/型/RLS/ドキュメント生成
    templates/    # コードテンプレート
  docs/           # ドキュメント
  tests/          # ユニットテスト
```

## 2. 入力仕様
- YAML/JSON/TypeScript型でデータモデルを記述
- 例: model.yaml
```yaml
entities:
  - name: user_profiles
    description: ユーザープロファイル情報
    fields:
      - name: id
        type: uuid
        primary: true
      - name: name
        type: text
        notNull: true
    relations:
      - type: hasMany
        target: participants
```

## 3. コア機能
### 3.1 パース
- YAML/JSON/TS型をJSオブジェクトに変換

### 3.2 生成
- SQL: CREATE TABLE, 外部キー, RLSポリシー
- TypeScript型: DB型→TS型マッピング
- CRUD: supabase-js用の型付き関数
- ドキュメント/API仕様書: Markdown, OpenAPI等で自動生成

### 3.3 CLI
- コマンド例:
  - `supatool gen:sql model.yaml`
  - `supatool gen:crud model.yaml`
  - `supatool gen:types model.yaml`
  - `supatool gen:rls model.yaml`
  - `supatool gen:docs model.yaml`

## 4. 拡張性
- プラグイン方式で新しい生成器追加可能
- テンプレート差し替え対応

## 5. テスト
- Jest等でユニットテスト
- 入力→出力のスナップショットテスト

## 6. エラー処理
- 入力バリデーション
- 生成失敗時は詳細エラー出力

## 7. 今後の拡張案
- ER図自動生成
- UI自動生成
- DBマイグレーション生成 