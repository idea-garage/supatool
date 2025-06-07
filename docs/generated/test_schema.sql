-- 自動生成: テーブル・リレーションDDL

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  name text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);


CREATE TABLE knowledge_articles (
  id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  title text,
  content text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  category_id uuid NOT NULL
);


CREATE TABLE categories (
  id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  name text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);


CREATE TABLE update_histories (
  id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  name text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  update_comment text,
  updated_by_user_id uuid NOT NULL,
  knowledge_article_id uuid NOT NULL
);



-- 自動生成: RLS/セキュリティポリシーDDL

