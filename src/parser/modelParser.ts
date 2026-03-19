// Model YAML parser (minimal template)
import fs from 'fs';
import yaml from 'js-yaml';

/**
 * Parse model YAML file and return JS object
 * @param filePath YAML file path
 */
export function parseModelYaml(filePath: string): any {
  const file = fs.readFileSync(filePath, 'utf8');
  return yaml.load(file);
} 