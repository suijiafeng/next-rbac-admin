import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isLockedOut, recordFailedAttempt, resetAttempts, LOCKOUT_DURATION_MINUTES } from '@/lib/login-attempt';

const { mockLoginAttempt } = vi.hoisted(() => ({
  mockLoginAttempt: {
    findUnique: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { loginAttempt: mockLoginAttempt },
}));

beforeEach(() => vi.clearAllMocks());

describe('LOCKOUT_DURATION_MINUTES', () => {
  it('锁定时长为 15 分钟', () => {
    expect(LOCKOUT_DURATION_MINUTES).toBe(15);
  });
});

describe('isLockedOut', () => {
  it('无记录时返回 false', async () => {
    mockLoginAttempt.findUnique.mockResolvedValue(null);
    expect(await isLockedOut('user:alice', 5)).toBe(false);
  });

  it('记录已过期时删除记录并返回 false', async () => {
    mockLoginAttempt.findUnique.mockResolvedValue({
      key: 'user:alice',
      count: 10,
      resetAt: new Date(Date.now() - 1000),
    });
    mockLoginAttempt.delete.mockResolvedValue({});
    expect(await isLockedOut('user:alice', 5)).toBe(false);
    expect(mockLoginAttempt.delete).toHaveBeenCalledWith({ where: { key: 'user:alice' } });
  });

  it('未达到最大尝试次数时返回 false', async () => {
    mockLoginAttempt.findUnique.mockResolvedValue({
      key: 'user:alice',
      count: 3,
      resetAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    expect(await isLockedOut('user:alice', 5)).toBe(false);
  });

  it('达到最大尝试次数时返回 true', async () => {
    mockLoginAttempt.findUnique.mockResolvedValue({
      key: 'user:alice',
      count: 5,
      resetAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    expect(await isLockedOut('user:alice', 5)).toBe(true);
  });

  it('超过最大尝试次数时返回 true', async () => {
    mockLoginAttempt.findUnique.mockResolvedValue({
      key: 'user:alice',
      count: 9,
      resetAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    expect(await isLockedOut('user:alice', 5)).toBe(true);
  });
});

describe('recordFailedAttempt', () => {
  it('调用 upsert 并递增 count', async () => {
    mockLoginAttempt.upsert.mockResolvedValue({});
    await recordFailedAttempt('user:alice');
    expect(mockLoginAttempt.upsert).toHaveBeenCalledOnce();
    const call = mockLoginAttempt.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ key: 'user:alice' });
    expect(call.create.count).toBe(1);
    expect(call.update.count).toEqual({ increment: 1 });
    expect(call.create.resetAt).toBeInstanceOf(Date);
    expect(call.update.resetAt).toBeInstanceOf(Date);
  });

  it('每次失败均刷新 resetAt 窗口（15 分钟后）', async () => {
    mockLoginAttempt.upsert.mockResolvedValue({});
    const before = Date.now();
    await recordFailedAttempt('user:bob');
    const resetAt: Date = mockLoginAttempt.upsert.mock.calls[0][0].update.resetAt;
    expect(resetAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000 - 100);
  });
});

describe('resetAttempts', () => {
  it('调用 prisma.loginAttempt.delete', async () => {
    mockLoginAttempt.delete.mockResolvedValue({});
    await resetAttempts('user:alice');
    expect(mockLoginAttempt.delete).toHaveBeenCalledWith({ where: { key: 'user:alice' } });
  });

  it('删除不存在的 key 时不抛错（catch 吞掉）', async () => {
    mockLoginAttempt.delete.mockRejectedValue(new Error('not found'));
    await expect(resetAttempts('user:ghost')).resolves.toBeUndefined();
  });
});
