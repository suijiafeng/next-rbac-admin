/**
 * 登录/注册失败次数追踪（数据库持久化）。
 *
 * key 可以是用户名（登录场景）或 "ip:x.x.x.x"（注册场景），
 * 数据持久化在 login_attempts 表中，支持多实例 / Serverless 部署。
 */
import { prisma } from '@/lib/prisma';

const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 锁定时长：15 分钟
export const LOCKOUT_DURATION_MINUTES = LOCKOUT_DURATION_MS / 60_000;

/**
 * 判断指定 key 当前是否被锁定。
 * @returns true = 已锁定，拒绝操作
 */
export async function isLockedOut(
  key: string,
  maxAttempts: number,
): Promise<boolean> {
  const record = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!record) return false;
  if (new Date() >= record.resetAt) {
    // 已过期，清除并放行
    await prisma.loginAttempt.delete({ where: { key } }).catch(() => null);
    return false;
  }
  return record.count >= maxAttempts;
}

/** 失败时记录一次尝试 */
export async function recordFailedAttempt(key: string): Promise<void> {
  const resetAt = new Date(Date.now() + LOCKOUT_DURATION_MS);

  await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, count: 1, resetAt },
    update: {
      count: {
        increment: 1,
      },
      resetAt, // 每次失败刷新窗口，防止攻击者卡在窗口边缘绕过限制
    },
  });
}

/** 操作成功后重置记录 */
export async function resetAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.delete({ where: { key } }).catch(() => null);
}
