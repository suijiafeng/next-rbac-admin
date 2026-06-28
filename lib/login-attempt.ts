/**
 * 登录失败次数追踪（基于用户名，内存存储）。
 *
 * 注意：此实现在单实例下有效；多实例/无服务器部署时应替换为共享缓存（如 Redis）。
 */

const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 锁定时长：15 分钟
const CLEANUP_INTERVAL = 50; // 每 50 次操作清理一次过期记录

interface AttemptRecord {
  count: number;
  resetAt: number; // Unix timestamp（毫秒）
}

const store = new Map<string, AttemptRecord>();
let operationCount = 0;

/** 清理已过期的记录，防止内存无限增长 */
function purgeExpired() {
  const now = Date.now();
  store.forEach((record, key) => {
    if (now >= record.resetAt) {
      store.delete(key);
    }
  });
}

/** 每隔固定次数操作后做一次确定性清理 */
function maybeCleanup() {
  operationCount += 1;
  if (operationCount >= CLEANUP_INTERVAL) {
    operationCount = 0;
    purgeExpired();
  }
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

  maybeCleanup();
}

/** 登录成功后重置记录 */
export function resetAttempts(username: string) {
  store.delete(username);
}
