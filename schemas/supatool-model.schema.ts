// supatool物理データスキーマ定義（フロント・バックエンド共通利用）
// 例: import { SUPATOOL_DATA_SCHEMA } from '@shared/schemas/supatool-model.schema';
// バリデーション例: ajv.compile(SUPATOOL_DATA_SCHEMA)

export const SUPATOOL_DATA_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  version: '1.0.0',
  type: 'object',
  properties: {
    dataSchema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          fields: {
            type: 'object',
            properties: {},
            additionalProperties: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                primary: { type: 'boolean' },
                notNull: { type: 'boolean' },
                default: {},
                label: { type: 'string' }
              },
              required: ['type']
            }
          },
          relations: {
            type: 'object',
            properties: {},
            additionalProperties: {
              type: 'object',
              properties: {
                ref: { type: 'string' }
              },
              required: ['ref']
            }
          },
          modelType: { type: 'string' },
          mainModel: { type: 'boolean' },
          original: { type: 'string' },
          raw: { type: 'string' },
          japanese: { type: 'string' }
        },
        required: ['description', 'fields']
      }
    },
    roles: {
      type: 'array',
      items: { type: 'string' }
    },
    security: {
      type: 'object',
      properties: {
        functions: { type: 'object' },
        policies: { type: 'object' }
      }
    }
  },
  required: ['dataSchema']
} as const; 