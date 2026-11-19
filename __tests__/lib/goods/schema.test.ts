import { describe, expect, it } from 'vitest';
import { STAGE_SCHEMAS, validateBySchema } from '@/lib/goods/schema';

describe('货品 schema 校验', () => {
  it('录入缺必填、编码格式不对、价格过小都会给出错误码', () => {
    const errors = validateBySchema(STAGE_SCHEMAS.entry.fields, {
      name: '',
      sku: 'BAD',
      category: 'demo-a',
      priceYuan: 0,
      stock: 1,
    });
    expect(errors.name).toBe('required');
    expect(errors.sku).toBe('pattern');
    expect(errors.priceYuan).toBe('min');
    expect(errors.stock).toBeUndefined();
  });

  it('上架字段齐全时通过', () => {
    const errors = validateBySchema(STAGE_SCHEMAS.listing.fields, {
      shelfChannel: 'demo-shop',
      shelfTitle: '演示上架标题',
      shelfPriceYuan: 19,
    });
    expect(errors).toEqual({});
  });

  it('审核环节没有录入字段，三个环节共用列描述', () => {
    expect(STAGE_SCHEMAS.review.fields).toEqual([]);
    expect(STAGE_SCHEMAS.entry.columns.map((column) => column.key)).toContain('sku');
    expect(STAGE_SCHEMAS.listing.columns.map((column) => column.key)).toContain('shelfTitle');
  });
});
