# データモデル設計の考察と推奨構造

## テンプレート雛形生成
- `supatool init <template>` コマンドで代表的なYAMLテンプレート（simple, tenant, saas等）から雛形を即生成可能
- プロジェクトやチーム標準の設計パターンをすぐに反映できる

## 1. 各種ORMの知見
- Prisma: モデル単位で型・制約・リレーションを一元管理。@id, @unique, @relation など明示的。
- TypeORM/Sequelize: フィールドごとに型・制約・リレーション。@OneToMany などで明示。
- Hasura/GraphQL: 型・制約・リレーション・コメントを一元管理。
- Drizzle: 型安全・Zod型連携・リレーション明示。

## 2. 推奨YAML/JSON構造
（※列定義は明示的に記述することを推奨。AI自動生成は雛形用途に限定）
```yaml
models:
  user_profiles:
    description: ユーザープロファイル情報
    fields:
      id:
        type: uuid
        primary: true
        default: uuid_generate_v4()
        label: ユーザーID
      name:
        type: text
        notNull: true
        label: 氏名
      created_at:
        type: timestamp
        default: now()
        label: 登録日時
    relations:
      participants:
        type: hasMany
        target: participants
        foreignKey: user_profile_id
```
- `label`で日本語ラベルを付与可能
- `description`でテーブル説明

## 3. セキュリティポリシー・RLS
- RLSや権限取得関数は`security`トップレベルで管理
```yaml
roles:
  - admin
  - user
  - guest

security:
  functions:
    get_user_role:
      description: ユーザーのロールを取得
      use_template: true
      template_type: simple  # simple/tenant/custom などテンプレ種別を指定
      # sql省略時はテンプレ自動生成
  policies:
    user_profiles:
      select:
        role: [admin, user]
        use_template: true
        template_type: simple
      update:
        role: [admin]
        use_template: true
        template_type: tenant
      delete:
        using: get_user_role() = 'admin'
        use_template: false
```
- DBファンクションを定義し、RLSポリシーで利用
- テンプレートタイプで拡張性・プラグイン性を担保
- テーブルごとにselect/update/insert/deleteの条件を簡潔に記述

## 4. 型安全性
- YAML/JSONスキーマをTypeScript型に変換し、型安全な自動生成を実現
- Zodやio-ts等の型バリデーションライブラリと連携可能
- 生成時にTypeScript型定義も同時出力

## 5. 今後の拡張性
- enum, index, unique, default, check, view, function, trigger等も拡張可能
- ER図生成、UI自動生成などは将来の拡張案として検討
- RLSテンプレートのプラグイン追加も容易
- ドキュメント自動生成にも対応しやすい 

## 6. 列定義の明示とAI自動生成の扱い
- 本番・業務用途では「列定義を明示」する方式が安全・安定
- 型・制約・ラベル・説明などを明記することで、生成物の品質・一貫性が担保される
- 将来的にAI補完（例：fields: auto で推論生成）をオプションで追加は可能
- AI生成は「雛形生成」や「初期ドラフト」用途に限定し、最終的には人手で明示的に列定義を記述する運用が推奨

### まとめ
- デフォルトは「列定義を詳細に記述」
- AIによる自動列生成は「補助的な雛形生成機能」として提供
- 本番用モデルは必ず人手で列定義をレビュー・明示 

## 7. モデルとテーブル・ビュー等の構造方針
- 「モデル」＝「テーブル・ビュー・関数・RLS等を束ねる業務/アプリ単位」として拡張する方針
- YAMLでは、まず「モデル（テーブル）」の一覧・ツリーを定義し、次に各テーブルの詳細（fields, relations, description等）、セキュリティ（roles, security: ...）をトップレベルまたはモデル配下で記述する
- 現状は「models: テーブル名: ...」のシンプルなリレーション記述で十分だが、将来的に下記のようなツリー構造もサポート可能

### モデル・テーブル・ビュー等のツリー構造例
```yaml
models:
  user:
    tables:
      profiles:
        fields: ...
      settings:
        fields: ...
    views:
      user_summary: ...
    security:
      # モデル単位のセキュリティ
roles:
  - admin
  - user
security:
  # 全体共通のセキュリティ
```
- テーブル間のリレーションは `relations` で記述（hasMany, belongsTo, foreignKey など）
- これは有向グラフ的にも解釈できるが、YAML上はシンプルなリストで十分
- 本格的なグラフ理論（ノード・エッジ型）は「リレーションの可視化・分析」用途で将来拡張可能

### まとめ
- 現状は「models: テーブル名: ...」のシンプルなリレーション記述で十分
- 拡張時は「モデル＝複数テーブル・ビュー等の束」とするツリー構造もサポート
- セキュリティ（roles, security: ...）はトップレベルまたはモデル配下で柔軟に記述
- グラフ理論は将来の可視化・分析用途で拡張方針を維持 