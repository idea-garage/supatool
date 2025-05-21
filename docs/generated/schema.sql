-- 自動生成: テーブル・リレーションDDL

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);


CREATE TABLE user_settings (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  two_factor_enabled boolean
);


CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  status text
);


CREATE TABLE projects (
  id uuid PRIMARY KEY,
  name text NOT NULL
);


CREATE TABLE members (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL
);


CREATE TABLE m_roles (
  id uuid PRIMARY KEY,
  name text NOT NULL
);


CREATE TABLE user_roles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL
);


-- [skip] auth.users（作成不要: Supabase組み込み等）

-- 自動生成: RLS/セキュリティポリシーDDL

-- ロールマスタ・ユーザーロールDDL（自動生成）
CREATE TABLE IF NOT EXISTS m_roles (
  id uuid PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL
);

INSERT INTO m_roles (id, name) VALUES (gen_random_uuid(), 'admin') ON CONFLICT DO NOTHING;
INSERT INTO m_roles (id, name) VALUES (gen_random_uuid(), 'user') ON CONFLICT DO NOTHING;
INSERT INTO m_roles (id, name) VALUES (gen_random_uuid(), 'guest') ON CONFLICT DO NOTHING;

-- get_user_role関数: ユーザーのロール取得
CREATE FUNCTION get_user_role() RETURNS text AS $$
BEGIN
  RETURN (SELECT r.name FROM user_roles ur JOIN m_roles r ON ur.role_id = r.id WHERE ur.user_id = current_setting('request.jwt.claim.sub', true)::uuid LIMIT 1);
END;
$$ LANGUAGE plpgsql; 

