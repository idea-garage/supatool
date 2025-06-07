export type TableDef = {
  fields: Record<string, any>;
  relations?: Record<string, any>;
  skipCreate?: boolean;
  description?: string;
};

export type ModelDef = {
  tables: Record<string, TableDef>;
  views?: Record<string, any>;
  security?: any;
}; 