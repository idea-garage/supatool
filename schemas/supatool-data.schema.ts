// supatool物理データスキーマ定義

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
          fields: {
            type: 'object',
            properties: {},
            additionalProperties: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                primary: { type: 'boolean' },
                notNull: { type: 'boolean' },
                default: {}
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
          tableName: { type: 'string' }
        },
        required: ['fields']
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