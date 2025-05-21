// モデルYAMLパース用（最小雛形）
// 日本語コメント
import fs from 'fs';
import yaml from 'js-yaml';

/**
 * モデルYAMLファイルをパースしてJSオブジェクトを返す
 * @param filePath YAMLファイルパス
 */
export function parseModelYaml(filePath: string): any {
  const file = fs.readFileSync(filePath, 'utf8');
  return yaml.load(file);
} 