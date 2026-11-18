import { beforeEach, describe, expect, it } from 'vitest';
import i18n, { switchLanguage } from '@/lib/i18n';

describe('货品页语言切换', () => {
  beforeEach(async () => {
    await switchLanguage('zh');
  });

  it('同一套文案可以在中英文之间切换', async () => {
    expect(i18n.t('goods.title.entry')).toBe('货品录入');
    expect(i18n.t('goods.title.review')).toBe('货品审核');
    expect(i18n.t('goods.title.listing')).toBe('上架配置');
    await switchLanguage('en');
    expect(i18n.language).toBe('en');
    expect(i18n.t('goods.title.entry')).toBe('Goods entry');
    expect(i18n.t('goods.title.review')).toBe('Goods review');
    expect(i18n.t('goods.title.listing')).toBe('Listing setup');
    expect(i18n.t('goods.action.approve')).toBe('Approve');
  });
});
