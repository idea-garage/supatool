// RLS/セキュリティポリシーSQL自動生成（最小雛形）
// 日本語コメント
import path from 'path';
import fs from 'fs';

/**
 * モデルからRLS/セキュリティポリシーSQLを生成
 * @param model モデルオブジェクト
 * @param outPath 出力先パス
 */
export function generateRlsSqlFromModel(model: any, outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let sql = '-- 自動生成: RLS/セキュリティポリシーDDL\n\n';
  const security = model.security || {};
  // roles定義があればロールマスタ・ユーザーロールDDLも自動生成
  if (model.roles && Array.isArray(model.roles)) {
    sql += '-- ロールマスタ・ユーザーロールDDL（自動生成）\n';
    sql += `CREATE TABLE IF NOT EXISTS m_roles (\n  id uuid PRIMARY KEY,\n  name text NOT NULL\n);\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS user_roles (\n  id uuid PRIMARY KEY,\n  user_id uuid NOT NULL,\n  role_id uuid NOT NULL\n);\n\n`;
    for (const role of model.roles) {
      sql += `INSERT INTO m_roles (id, name) VALUES (gen_random_uuid(), '${role}') ON CONFLICT DO NOTHING;\n`;
    }
    sql += '\n';
  }
  // DBファンクション
  if (security.functions) {
    for (const [fnName, fn] of Object.entries(security.functions)) {
      const f = fn as any;
      const useTemplate = f.use_template !== false; // デフォルトtrue
      const templateType = f.template_type || 'simple';
      let sqlBody = f.sql;
      if (!sqlBody && useTemplate) {
        // template_type優先
        if (templateType) {
          sqlBody = getFunctionTemplate(fnName, templateType, model);
        }
      }
      // fallback: roles定義があればuser_roles参照テンプレ
      if (!sqlBody) {
        if (model.roles && Array.isArray(model.roles)) {
          sqlBody = `CREATE FUNCTION ${fnName}() RETURNS text AS $$\nBEGIN\n  -- ログインユーザーのロールを返す（テンプレ）\n  RETURN (SELECT r.name FROM user_roles ur JOIN m_roles r ON ur.role_id = r.id WHERE ur.user_id = current_setting('request.jwt.claim.sub', true)::uuid LIMIT 1);\nEND;\n$$ LANGUAGE plpgsql;`;
        } else {
          sqlBody = `CREATE FUNCTION ${fnName}() RETURNS text AS $$\nBEGIN\n  -- TODO: ロジックを記述\n  RETURN 'admin';\nEND;\n$$ LANGUAGE plpgsql;`;
        }
      }
      sql += `-- ${fnName}関数: ユーザーのロール取得\n`;
      sql += `${sqlBody}\n\n`;
    }
  }
  // RLSポリシー
  if (security.policies) {
    for (const [tableName, tablePolicies] of Object.entries(security.policies)) {
      const p = tablePolicies as any;
      for (const [action, policy] of Object.entries(p)) {
        const pol = policy as any;
        const useTemplate = pol.use_template !== false; // デフォルトtrue
        const templateType = pol.template_type || 'simple';
        let usingCond = pol.using;
        if (!usingCond && useTemplate && pol.role && Array.isArray(pol.role)) {
          usingCond = getPolicyTemplate(pol.role, templateType);
        }
        if (!usingCond) {
          usingCond = 'true -- TODO: 適切な条件を記述';
        }
        sql += `-- ${tableName}テーブル ${action}用RLSポリシー\n`;
        sql += `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n`;
        sql += `CREATE POLICY ${tableName}_${action}_policy ON ${tableName}\n  FOR ${action.toUpperCase()}\n  USING (${usingCond});\n\n`;
      }
    }
  }
  fs.writeFileSync(outPath, sql);
}

// テンプレート切り替え関数
function getFunctionTemplate(fnName: string, type: string, model: any): string {
  const templatePath = path.join(__dirname, '../templates/rls', `function_${type}.sql`);
  let template = fs.readFileSync(templatePath, 'utf-8');
  template = template.replace(/\$\{functionName\}/g, fnName);
  template = template.replace(/\$\{userIdExpr\}/g, "current_setting('request.jwt.claim.sub', true)::uuid");
  template = template.replace(/\$\{tenantIdExpr\}/g, "current_setting('tenant.id', true)::uuid");
  return template;
}

function getPolicyTemplate(roles: string[], type: string): string {
  const templatePath = path.join(__dirname, '../templates/rls', `policy_${type}.sql`);
  let template = fs.readFileSync(templatePath, 'utf-8');
  template = template.replace(/\$\{roles\}/g, roles.map(r => `'${r}'`).join(', '));
  template = template.replace(/\$\{tenantIdExpr\}/g, "current_setting('tenant.id', true)::uuid");
  return template;
} 