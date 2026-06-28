/**
 * 登录失败次数追踪（基于用户名，内存存储）。
 *
 * 注意：此实现在单实例下有效；多实例/无服务器部署时应替换为共享缓存（如 Redis）。
 */

const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 锁定时长：15 分钟

interface AttemptRecord {
  count: number;
  resetAt: number; // Unix timestamp（毫秒）
}

const store = new Map<string, AttemptRecord>();

/** 清理已过期的记录，防止内存无限增长 */
function purgeExpired() {
  const now = Date.now();
  store.forEach((record, key) => {
    if (now >= record.resetAt) {
      store.delete(key);
    }
  });
}

/**
 * 判断指定用户名当前是否被锁定。
 * @returns true = 已锁定，拒绝登录
 */
export function isLockedOut(username: string, maxAttempts: number): boolean {
  const record = store.get(username);
  if (!record) return false;
  if (Date.now() >= record.resetAt) {
    store.delete(username);
    return false;
  }
  return record.count >= maxAttempts;
}

/** 登录失败时记录一次尝试 */
export function recordFailedAttempt(username: string) {
  const now = Date.now();
  const existing = store.get(username);

  if (!existing || now >= existing.resetAt) {
    store.set(username, { count: 1, resetAt: now + LOCKOUT_DURATION_MS });
  } else {
    existing.count += 1;
  }

  // 低频清理，避免内存无限积累
  if (Math.random() < 0.05) {
    purgeExpired();
  }
}

/** 登录成功后重置记录 */
export function resetAttempts(username: string) {
  store.delete(username);
}
