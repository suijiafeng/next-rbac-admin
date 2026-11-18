import { expect, test, type Page } from '@playwright/test';
import fs from 'fs';

const ARTIFACTS = '/opt/cursor/artifacts';

async function shot(page: Page, name: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: `${ARTIFACTS}/${name}.png`, fullPage: true });
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

test('学员作答交卷出分，管理员切换筛选后三张图一起变', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, 'user');
  await page.goto('/exams');
  await expect(page.getByTestId('paper-demo-intro')).toBeVisible();
  await page.getByTestId('action-demo-intro-take').click();
  await expect(page.getByTestId('exam-take')).toBeVisible();

  await page.getByTestId('option-q-role-role').click();
  await page.getByTestId('option-q-actions-view').click();
  await page.getByTestId('option-q-actions-edit').click();
  await page.getByTestId('option-q-approve-false').click();
  await page.getByTestId('blank-q-author').fill('suijiafeng');
  await expect(page.getByText('进度已保存')).toBeVisible();

  await shot(page, 'exam-take-desktop', 1440, 900);
  await shot(page, 'exam-take-mobile', 390, 844);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByTestId('exam-submit').click();
  await expect(page.getByTestId('exam-score')).toHaveText('100');
  await shot(page, 'exam-result-desktop', 1440, 900);
  await shot(page, 'exam-result-mobile', 390, 844);

  await login(page, 'admin');
  await page.goto('/exam-stats');
  await expect(page.getByTestId('chart-trend-summary')).toBeVisible();
  await expect(page.getByTestId('chart-trend')).toBeVisible();
  await expect(page.getByTestId('chart-rank')).toBeVisible();
  await expect(page.getByTestId('chart-dist')).toBeVisible();
  const before = {
    trend: await page.getByTestId('chart-trend-summary').innerText(),
    rank: await page.getByTestId('chart-rank-summary').innerText(),
    dist: await page.getByTestId('chart-dist-summary').innerText(),
  };
  await shot(page, 'exam-stats-desktop', 1440, 900);
  await page.setViewportSize({ width: 390, height: 1680 });
  await page.reload();
  await expect(page.getByTestId('chart-rank-summary')).toBeVisible();
  await page.waitForTimeout(600);
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: `${ARTIFACTS}/exam-stats-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.getByTestId('chart-trend-summary')).toHaveText(before.trend);

  await page.getByText('演示部门乙', { exact: true }).click();
  await expect(page.getByTestId('chart-trend-summary')).not.toHaveText(before.trend);
  await expect(page.getByTestId('chart-rank-summary')).not.toHaveText(before.rank);
  await expect(page.getByTestId('chart-dist-summary')).not.toHaveText(before.dist);

  await login(page, 'super_admin');
  await page.goto('/exams');
  const approve = page.getByTestId('action-demo-pending-approve');
  const reject = page.getByTestId('action-demo-pending-reject');
  await expect(approve).toBeVisible();
  await expect(reject).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await approve.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: `${ARTIFACTS}/exam-approval-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await approve.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${ARTIFACTS}/exam-approval-mobile.png` });
});
