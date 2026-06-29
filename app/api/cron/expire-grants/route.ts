import { apiError, apiSuccess } from '@/lib/api-response';
import { expireDueGrants } from '@/lib/temp-grant';

export const dynamic = 'force-dynamic';

/**
 * 定时任务入口（Vercel Cron 兜底）：扫描到期临时授权并自动回收。
 * 配置了 CRON_SECRET 时需携带 `Authorization: Bearer <secret>` 或 `?secret=<secret>`。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    const url = new URL(request.url);
    const ok = auth === `Bearer ${secret}` || url.searchParams.get('secret') === secret;
    if (!ok) {
      return apiError('无权限', 401);
    }
  }

  const expired = await expireDueGrants();
  return apiSuccess({ expired }, `已回收 ${expired} 条到期临时授权`);
}
