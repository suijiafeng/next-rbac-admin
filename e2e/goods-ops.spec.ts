import { expect, test, type Page } from '@playwright/test';
import fs from 'fs';

const ARTIFACTS = '/opt/cursor/artifacts';

async function shot(page: Page, name: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: `${ARTIFACTS}/${name}.png` });
}

async function login(page: Page, username: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('123456');
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await page.waitForURL('**/dashboard');
}

test('录入货品、审核通过、上架，并切换英文', async ({ page }) => {
  test.setTimeout(180_000);
  const sku = `demo-${Date.now().toString().slice(-8)}`;
  await login(page, 'admin');
  await page.goto('/goods-entry');
  await expect(page.getByTestId('goods-title')).toHaveText('货品录入');
  await page.getByTestId('field-name').fill('演示帆布袋');
  await page.getByTestId('field-sku').fill(sku);
  await page.getByTestId('field-category').click();
  await page.locator('.ant-select-dropdown').getByText('演示分类甲', { exact: true }).click();
  await page.getByTestId('field-priceYuan').fill('19');
  await page.getByTestId('field-stock').fill('4');
  await page.getByTestId('goods-save').click();
  const row = page.getByRole('row', { name: new RegExp(sku) });
  await expect(row).toContainText('草稿');
  await shot(page, 'goods-entry-desktop', 1440, 900);
  await shot(page, 'goods-entry-mobile', 390, 844);
  await page.setViewportSize({ width: 1440, height: 900 });
  await row.getByRole('button', { name: /提\s*交\s*审\s*核/ }).click();
  await expect(row).toContainText('待审核');

  await login(page, 'super_admin');
  await page.goto('/goods-review');
  const reviewRow = page.getByRole('row', { name: new RegExp(sku) });
  await expect(reviewRow).toBeVisible();
  await shot(page, 'goods-review-desktop', 1440, 900);
  await shot(page, 'goods-review-mobile', 390, 844);
  await page.setViewportSize({ width: 1440, height: 900 });
  await reviewRow.getByRole('button', { name: /通\s*过/ }).click();
  await expect(reviewRow).toHaveCount(0);

  await login(page, 'admin');
  await page.goto('/goods-listing');
  await page.getByRole('row', { name: new RegExp(sku) }).getByRole('button', { name: sku }).click();
  await page.getByTestId('field-shelfChannel').click();
  await page.locator('.ant-select-dropdown').getByText('演示店铺', { exact: true }).click();
  await page.getByTestId('field-shelfTitle').fill('演示上架标题');
  await page.getByTestId('field-shelfPriceYuan').fill('21');
  await page.getByTestId('goods-shelf-save').click();
  await expect(page.getByRole('row', { name: new RegExp(sku) })).toContainText('演示上架标题');
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('goods-title')).toHaveText('Listing setup');
  await expect(page.getByRole('button', { name: /Save listing/ })).toBeVisible();
  await shot(page, 'goods-listing-en-desktop', 1440, 900);
  await shot(page, 'goods-listing-en-mobile', 390, 844);
});

test('运营看板首屏含指标，图表按视图加载，筛选后多图一起变', async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, 'admin');

  const scripts: string[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/_next/static/chunks/') || response.status() !== 200) return;
    try {
      scripts.push(await response.text());
    } catch {
      // 响应体可能已被读取
    }
  });
  await page.goto('/ops?range=30d&view=finance');
  await expect(page.getByTestId('metric-finance')).toContainText('48000');
  await expect(page.getByTestId('metric-business')).toContainText('320');
  await expect(page.getByTestId('metric-staff')).toContainText('6');
  await expect(page.getByTestId('ops-chart-revenue')).toContainText('30d 收入 48000');
  await expect(page.getByTestId('ops-chart-cost')).toContainText('30d 成本 26000');
  const loaded = scripts.join('\n');
  expect(loaded).toContain('OPS_CHUNK_FINANCE');
  expect(loaded).not.toContain('OPS_CHUNK_BUSINESS');
  expect(loaded).not.toContain('OPS_CHUNK_STAFF');
  await shot(page, 'ops-desktop', 1440, 900);
  await shot(page, 'ops-mobile', 390, 900);

  await page.getByTestId('ops-range-7d').click();
  await expect(page).toHaveURL(/range=7d/);
  await expect(page.getByTestId('metric-finance')).toContainText('12000');
  await expect(page.getByTestId('ops-chart-revenue')).toContainText('7d 收入 12000');
  await expect(page.getByTestId('ops-chart-cost')).toContainText('7d 成本 7000');

  const cookies = await context.cookies();
  const bare = await browser.newContext({ javaScriptEnabled: false });
  await bare.addCookies(cookies);
  const plain = await bare.newPage();
  await plain.goto('http://127.0.0.1:3000/ops?range=30d&view=finance');
  await expect(plain.getByTestId('metric-finance')).toContainText('48000');
  await expect(plain.getByTestId('metric-business')).toContainText('320');
  await expect(plain.getByTestId('metric-staff')).toContainText('6');
  const html = await plain.content();
  expect(html).toContain('演示财务收入');
  expect(html).toContain('演示业务订单');
  expect(html).toContain('演示人员编制');
  await context.close();
  await bare.close();
});
