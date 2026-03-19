// Document generation (minimal template)
import path from 'path';
import fs from 'fs';
import type { TableDef, ModelDef } from './types';

/**
 * Generate and save table definition doc (Markdown)
 * @param model Model object
 * @param outPath Output path
 */
export function generateTableDocMarkdown(model: any, outPath: string) {
  // Create output directory
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let md = '# Table definition doc\n\n';
  for (const m of model.models) {
    const tables = m.tables || {};
    for (const [tableName, table] of Object.entries(tables as Record<string, TableDef>)) {
      const t = table;
      let skipNote = t.skipCreate ? ' (skip: Supabase built-in)' : '';
      md += `## ${tableName}${skipNote}\n`;
      if (t.description) md += `${t.description}\n`;
      md += '\n| Column | Type | PK | NotNull | Default | Label |\n|---|---|---|---|---|---|\n';
      for (const [colName, col] of Object.entries(t.fields || {})) {
        const c = col as any;
        md += `| ${colName} | ${c.type || ''} | ${c.primary ? '★' : ''} | ${c.notNull ? '○' : ''} | ${c.default || ''} | ${c.label || ''} |\n`;
      }
      md += '\n';
    }
  }
  fs.writeFileSync(outPath, md);
}

/**
 * Generate and save relations list (Markdown)
 * @param model Model object
 * @param outPath Output path
 */
export function generateRelationsMarkdown(model: any, outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let md = '# Relations list\n\n| Table | Relation | Target | Foreign key |\n|---|---|---|---|\n';
  for (const m of model.models) {
    const tables = m.tables || {};
    for (const [tableName, table] of Object.entries(tables as Record<string, TableDef>)) {
      const t = table;
      for (const [relName, rel] of Object.entries(t.relations || {})) {
        const r = rel as any;
        md += `| ${tableName} | ${r.type || ''} | ${r.target || ''} | ${r.foreignKey || ''} |\n`;
      }
    }
  }
  fs.writeFileSync(outPath, md);
} 