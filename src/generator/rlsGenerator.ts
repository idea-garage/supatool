// RLS/security policy SQL auto-generation (minimal template)
// Todo: make schema configurable
import path from 'path';
import fs from 'fs';

/**
 * Generate RLS/security policy SQL from model
 * @param model Model object
 * @param outPath Output path
 */
export function generateRlsSqlFromModel(model: any, outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // dataSchema/models: get table list
  let tables: any[] = [];
  if (Array.isArray(model.dataSchema)) {
    tables = model.dataSchema.map((t: any) => ({ tableName: t.tableName || t.raw, ...t }));
  } else if (Array.isArray(model.models)) {
    for (const m of model.models) {
      if (m.tables) {
        for (const [tableName, table] of Object.entries(m.tables)) {
          tables.push(Object.assign({ tableName }, table));
        }
      }
    }
  }
  let sql = '-- Auto-generated: RLS/security policy DDL\n\n';
  const security = model.security || {};
  // If roles defined, auto-generate role master and user_roles DDL
  if (model.roles && Array.isArray(model.roles)) {
    sql += '-- Role master and user_roles DDL (auto-generated)\n';
    sql += `CREATE TABLE IF NOT EXISTS m_roles (\n  id uuid PRIMARY KEY,\n  name text NOT NULL\n);\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS user_roles (\n  id uuid PRIMARY KEY,\n  user_id uuid NOT NULL,\n  role_id uuid NOT NULL\n);\n\n`;
    for (const role of model.roles) {
      sql += `INSERT INTO m_roles (id, name) VALUES (gen_random_uuid(), '${role}') ON CONFLICT DO NOTHING;\n`;
    }
    sql += '\n';
  }
  // DB function
  if (security.functions) {
    for (const [fnName, fn] of Object.entries(security.functions)) {
      const f = fn as any;
      const useTemplate = f.use_template !== false; // default true
      const templateType = f.template_type || 'simple';
      let sqlBody = f.sql;
      if (!sqlBody && useTemplate) {
        // template_type takes precedence
        if (templateType) {
          sqlBody = getFunctionTemplate(fnName, templateType, model);
        }
      }
      // fallback: if roles defined use user_roles template
      if (!sqlBody) {
        if (model.roles && Array.isArray(model.roles)) {
          sqlBody = `CREATE FUNCTION ${fnName}() RETURNS text AS $$\nBEGIN\n  -- Return current user role (template)\n  RETURN (SELECT r.name FROM user_roles ur JOIN m_roles r ON ur.role_id = r.id WHERE ur.user_id = current_setting('request.jwt.claim.sub', true)::uuid LIMIT 1);\nEND;\n$$ LANGUAGE plpgsql;`;
        } else {
          sqlBody = `CREATE FUNCTION ${fnName}() RETURNS text AS $$\nBEGIN\n  -- TODO: implement logic\n  RETURN 'admin';\nEND;\n$$ LANGUAGE plpgsql;`;
        }
      }
      sql += `-- ${fnName} function: get user role\n`;
      sql += `${sqlBody}\n\n`;
    }
  }
  // RLS policies
  if (security.policies) {
    for (const [tableName, tablePolicies] of Object.entries(security.policies)) {
      const p = tablePolicies as any;
      for (const [action, policy] of Object.entries(p)) {
        const pol = policy as any;
        const useTemplate = pol.use_template !== false; // default true
        const templateType = pol.template_type || 'simple';
        let usingCond = pol.using;
        if (!usingCond && useTemplate && pol.role && Array.isArray(pol.role)) {
          usingCond = getPolicyTemplate(pol.role, templateType);
        }
        if (!usingCond) {
          usingCond = 'true -- TODO: write appropriate condition';
        }
        sql += `-- ${tableName} table RLS policy for ${action}\n`;
        sql += `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n`;
        sql += `CREATE POLICY ${tableName}_${action}_policy ON ${tableName}\n  FOR ${action.toUpperCase()}\n  USING (${usingCond});\n\n`;
      }
    }
  }
  fs.writeFileSync(outPath, sql);
}

// Template switcher function
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