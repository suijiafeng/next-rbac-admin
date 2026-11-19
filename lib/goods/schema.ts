export type GoodsStage = 'entry' | 'review' | 'listing';

export type FieldType = 'text' | 'number' | 'select';

export interface FieldOption {
  value: string;
  labelKey: string;
}

export interface FieldSchema {
  key: string;
  labelKey: string;
  type: FieldType;
  required?: boolean;
  min?: number;
  pattern?: string;
  options?: FieldOption[];
}

export interface ColumnSchema {
  key: string;
  labelKey: string;
}

export interface StageSchema {
  stage: GoodsStage;
  titleKey: string;
  columns: ColumnSchema[];
  fields: FieldSchema[];
}

const entryFields: FieldSchema[] = [
  { key: 'name', labelKey: 'goods.field.name', type: 'text', required: true },
  { key: 'sku', labelKey: 'goods.field.sku', type: 'text', required: true, pattern: '^[a-z0-9-]{4,32}$' },
  {
    key: 'category',
    labelKey: 'goods.field.category',
    type: 'select',
    required: true,
    options: [
      { value: 'demo-a', labelKey: 'goods.option.categoryA' },
      { value: 'demo-b', labelKey: 'goods.option.categoryB' },
    ],
  },
  { key: 'priceYuan', labelKey: 'goods.field.price', type: 'number', required: true, min: 1 },
  { key: 'stock', labelKey: 'goods.field.stock', type: 'number', required: true, min: 0 },
];

const listingFields: FieldSchema[] = [
  {
    key: 'shelfChannel',
    labelKey: 'goods.field.channel',
    type: 'select',
    required: true,
    options: [
      { value: 'demo-shop', labelKey: 'goods.option.channelShop' },
      { value: 'demo-window', labelKey: 'goods.option.channelWindow' },
    ],
  },
  { key: 'shelfTitle', labelKey: 'goods.field.shelfTitle', type: 'text', required: true },
  { key: 'shelfPriceYuan', labelKey: 'goods.field.shelfPrice', type: 'number', required: true, min: 1 },
];

const sharedColumns: ColumnSchema[] = [
  { key: 'sku', labelKey: 'goods.field.sku' },
  { key: 'name', labelKey: 'goods.field.name' },
  { key: 'category', labelKey: 'goods.field.category' },
  { key: 'reviewStatus', labelKey: 'goods.field.status' },
];

export const STAGE_SCHEMAS: Record<GoodsStage, StageSchema> = {
  entry: {
    stage: 'entry',
    titleKey: 'goods.title.entry',
    columns: sharedColumns,
    fields: entryFields,
  },
  review: {
    stage: 'review',
    titleKey: 'goods.title.review',
    columns: sharedColumns,
    fields: [],
  },
  listing: {
    stage: 'listing',
    titleKey: 'goods.title.listing',
    columns: [
      ...sharedColumns,
      { key: 'shelfChannel', labelKey: 'goods.field.channel' },
      { key: 'shelfTitle', labelKey: 'goods.field.shelfTitle' },
    ],
    fields: listingFields,
  },
};

export function validateBySchema(
  fields: FieldSchema[],
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  fields.forEach((field) => {
    const raw = values[field.key];
    const empty = raw === undefined || raw === null || String(raw).trim() === '';
    if (field.required && empty) {
      errors[field.key] = 'required';
      return;
    }
    if (empty) return;
    if (field.type === 'number') {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || (field.min !== undefined && numeric < field.min)) {
        errors[field.key] = 'min';
      }
      return;
    }
    if (field.pattern && !new RegExp(field.pattern).test(String(raw).trim())) {
      errors[field.key] = 'pattern';
    }
  });
  return errors;
}
