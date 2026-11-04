import { describe, it, expect, vi, beforeEach } from 'vitest';
import { effectiveRoleNames, getCurrentAdminUser } from '@/lib/admin-user';
import { BUSINESS_HOURS } from '@/lib/governance';

const { mockGetAdminSession, mockFindUnique, mockFindManyGrants } = vi.hoisted(() => ({
  mockGetAdminSession: vi.fn(),
  mockFindUnique: vi.fn(),
  mockFindManyGrants: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAdminSession: mockGetAdminSession }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    tempGrant: { findMany: mockFindManyGrants },
  },
}));

const BASE_USER = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  email: 'admin@example.com',
  avatar: null,
  status: 1,
  authVersion: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  userRoles: [{ role: { name: 'ADMIN' } }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindManyGrants.mockResolvedValue([]);
});

function atLocalHour(hour: number): Date {
  const now = new Date();
  now.setHours(hour, 0, 0, 0);
  return now;
}

describe('effectiveRoleNames', () => {
  const now = new Date('2026-11-04T12:00:00.000Z');

  it('没有临时授权时原样返回角色', () => {
    expect(effectiveRoleNames(['ADMIN', 'USER'], [], now)).toEqual(['ADMIN', 'USER']);
  });

  it('ACTIVE 且未过期的授权保留提升角色', () => {
    const names = effectiveRoleNames(
      ['USER', 'ADMIN'],
      [{
        grantedRole: 'ADMIN',
        condition: null,
        expiresAt: new Date(now.getTime() + 60_000),
      }],
      now,
    );
    expect(names).toEqual(['USER', 'ADMIN']);
  });

  it('expiresAt 等于 now 时仍有效（与 cron 的 lt 条件一致）', () => {
    const names = effectiveRoleNames(
      ['USER', 'ADMIN'],
      [{ grantedRole: 'ADMIN', condition: null, expiresAt: now }],
      now,
    );
    expect(names).toEqual(['USER', 'ADMIN']);
  });

  it('已过期的 ACTIVE 授权不再计入，常驻角色保留', () => {
    const names = effectiveRoleNames(
      ['USER', 'ADMIN'],
      [{
        grantedRole: 'ADMIN',
        condition: null,
        expiresAt: new Date(now.getTime() - 1),
      }],
      now,
    );
    expect(names).toEqual(['USER']);
  });

  it('角色名大小写不敏感', () => {
    const names = effectiveRoleNames(
      ['admin'],
      [{
        grantedRole: 'ADMIN',
        condition: null,
        expiresAt: new Date(now.getTime() - 1),
      }],
      now,
    );
    expect(names).toEqual([]);
  });

  it('同一角色只要还有一条未过期授权就保留', () => {
    const names = effectiveRoleNames(
      ['USER', 'ADMIN'],
      [
        { grantedRole: 'ADMIN', condition: null, expiresAt: new Date(now.getTime() - 1) },
        { grantedRole: 'ADMIN', condition: null, expiresAt: new Date(now.getTime() + 60_000) },
      ],
      now,
    );
    expect(names).toEqual(['USER', 'ADMIN']);
  });

  it('已回收 / 已过期状态的历史记录不剥夺常驻角色', () => {
    const names = effectiveRoleNames(
      ['ADMIN'],
      [{
        grantedRole: 'ADMIN',
        condition: null,
        status: 'EXPIRED',
        expiresAt: new Date(now.getTime() - 60_000),
      }],
      now,
    );
    expect(names).toEqual(['ADMIN']);
  });

  it('工作时间之外挂起带约束的临时角色', () => {
    const night = atLocalHour(22);
    const names = effectiveRoleNames(
      ['USER', 'ADMIN'],
      [{
        grantedRole: 'ADMIN',
        condition: JSON.stringify(BUSINESS_HOURS),
        expiresAt: new Date(night.getTime() + 60 * 60 * 1000),
      }],
      night,
    );
    expect(names).toEqual(['USER']);
  });

  it('工作时间之内保留带约束的临时角色', () => {
    const noon = atLocalHour(10);
    const names = effectiveRoleNames(
      ['USER', 'ADMIN'],
      [{
        grantedRole: 'ADMIN',
        condition: JSON.stringify(BUSINESS_HOURS),
        expiresAt: new Date(noon.getTime() + 60 * 60 * 1000),
      }],
      noon,
    );
    expect(names).toEqual(['USER', 'ADMIN']);
  });

  it('过期优先于仍处在工作时间内', () => {
    const noon = atLocalHour(10);
    const names = effectiveRoleNames(
      ['USER', 'ADMIN'],
      [{
        grantedRole: 'ADMIN',
        condition: JSON.stringify(BUSINESS_HOURS),
        expiresAt: new Date(noon.getTime() - 1),
      }],
      noon,
    );
    expect(names).toEqual(['USER']);
  });

  it('不受临时授权影响的更高角色仍然保留', () => {
    const names = effectiveRoleNames(
      ['SUPER_ADMIN', 'ADMIN'],
      [{
        grantedRole: 'ADMIN',
        condition: null,
        expiresAt: new Date(now.getTime() - 1),
      }],
      now,
    );
    expect(names).toEqual(['SUPER_ADMIN']);
  });
});

describe('getCurrentAdminUser', () => {
  it('无 session 时返回 null', async () => {
    mockGetAdminSession.mockResolvedValue(null);
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('session.userId 缺失时返回 null', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: null });
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('数据库用户不存在时返回 null', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue(null);
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('用户 status !== 1（被禁用）时返回 null', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER, status: 0 });
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('authVersion 不匹配时返回 null（令牌已失效）', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 2 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER, authVersion: 1 });
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('一切正常时返回用户信息（不含 userRoles）', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER });
    const user = await getCurrentAdminUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe(1);
    expect(user?.username).toBe('admin');
    expect(user?.role).toBe('ADMIN');
    expect(user).not.toHaveProperty('userRoles');
  });

  it('session.authVersion 未定义时按 0 处理', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER, authVersion: 0 });
    const user = await getCurrentAdminUser();
    expect(user).not.toBeNull();
  });

  it('按用户读取 ACTIVE 临时授权', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER });
    await getCurrentAdminUser();
    expect(mockFindManyGrants).toHaveBeenCalledWith({
      where: { userId: 1, status: 'ACTIVE' },
      select: { grantedRole: true, condition: true, expiresAt: true },
    });
  });

  it('已过期的临时管理员在鉴权时降回普通用户', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue({
      ...BASE_USER,
      userRoles: [{ role: { name: 'USER' } }, { role: { name: 'ADMIN' } }],
    });
    mockFindManyGrants.mockResolvedValue([
      {
        grantedRole: 'ADMIN',
        condition: null,
        expiresAt: new Date(Date.now() - 60_000),
      },
    ]);
    const user = await getCurrentAdminUser();
    expect(user?.role).toBe('USER');
  });

  it('未过期的临时管理员仍然是 ADMIN', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue({
      ...BASE_USER,
      userRoles: [{ role: { name: 'USER' } }, { role: { name: 'ADMIN' } }],
    });
    mockFindManyGrants.mockResolvedValue([
      {
        grantedRole: 'ADMIN',
        condition: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    ]);
    const user = await getCurrentAdminUser();
    expect(user?.role).toBe('ADMIN');
  });

  it('临时授权查询失败时降级为库里的角色', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER });
    mockFindManyGrants.mockRejectedValue(new Error('db down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = await getCurrentAdminUser();
    expect(user?.role).toBe('ADMIN');
    errorSpy.mockRestore();
  });
});
