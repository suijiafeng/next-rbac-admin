import { apiError, apiSuccess } from '@/lib/api-response';
import { expireDueGrants } from '@/lib/temp-grant';

export const dynamic = 'force-dynamic';

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;

  let diff = 0;
  for (let i = 0; i < aBuffer.length; i += 1) {
    diff |= aBuffer[i] ^ bBuffer[i];
  }
  return diff === 0;
}

function readBearer(header: string | null): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  const space = trimmed.indexOf(' ');
  if (space <= 0) return null;
  if (trimmed.slice(0, space).toLowerCase() !== 'bearer') return null;
  const token = trimmed.slice(space + 1).trim();
  return token.length > 0 ? token : null;
}

function isCronAuthorized(request: Request, secret: string): boolean {
  const bearer = readBearer(request.headers.get('authorization'));
  if (bearer && timingSafeEqualString(bearer, secret)) return true;
  const querySecret = new URL(request.url).searchParams.get('secret');
  return Boolean(querySecret && timingSafeEqualString(querySecret, secret));
}

/**
 * 定时任务入口（Vercel Cron 兜底）：扫描到期临时授权并自动回收。
 * CRON_SECRET 必填。请求需携带 `Authorization: Bearer <CRON_SECRET>`
 * （在 Vercel 配置同名环境变量后，Cron 会自动附带）或 `?secret=<CRON_SECRET>`。
 * 未配置密钥、或请求未带上正确密钥时拒绝执行。
 *
 * 权限收回不依赖本任务：鉴权读取时会忽略已过期的临时授权。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron] CRON_SECRET is not set; refusing to run expire-grants');
    return apiError('无权限', 401);
  }
  if (!isCronAuthorized(request, secret)) {
    return apiError('无权限', 401);
  }

  const expired = await expireDueGrants();
  return apiSuccess({ expired }, `已回收 ${expired} 条到期临时授权`);
}
