import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequirePermission,
  mockFindMany,
  mockCount,
  mockFindFirst,
  mockRoleFind,
  mockUserCreate,
  mockBcryptHash,
  mockWriteAuditLog,
} = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockFindFirst: vi.fn(),
  mockRoleFind: vi.fn(),
  mockUserCreate: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockWriteAuditLog: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: mockFindMany, count: mockCount, findFirst: mockFindFirst, create: mockUserCreate },
    role: { findUnique: mockRoleFind },
  },
}));
vi.mock('bcryptjs', () => ({ default: { hash: mockBcryptHash } }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));

import { GET, POST } from '@/app/api/users/route';

const ACTOR = { id: 1, username: 'admin', role: 'ADMIN' };
const RAW_USER = {
  id: 2,
  username: 'alice',
  nickname: 'Alice',
  email: null,
  status: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  userRoles: [{ role: { name: 'USER' } }],
};

function makeGet(search = '') {
  return new Request(`http://localhost/api/users${search}`);
}
function makePost(body: object) {
  return new Request('http://localhost/api/users', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue({ user: ACTOR, role: 'ADMIN', permissions: [] });
  mockFindMany.mockResolvedValue([RAW_USER]);
  mockCount.mockResolvedValue(1);
  mockFindFirst.mockResolvedValue(null);
  mockRoleFind.mockResolvedValue({ id: 10, name: 'USER' });
  mockBcryptHash.mockResolvedValue('hashed');
  mockUserCreate.mockResolvedValue(RAW_USER);
  mockWriteAuditLog.mockResolvedValue(undefined);
});

// ─── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it('成功返回用户列表和分页信息', async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.list).toHaveLength(1);
    expect(body.data.total).toBe(1);
    expect(body.data).toHaveProperty('page');
    expect(body.data).toHaveProperty('pageSize');
  });

  it('status 参数非法时返回 400', async () => {
    const res = await GET(makeGet('?status=9'));
    expect(res.status).toBe(400);
  });

  it('status=0 筛选禁用用户', async () => {
    await GET(makeGet('?status=0'));
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: 0 });
  });

  it('username 参数传入 findMany where', async () => {
    await GET(makeGet('?username=alice'));
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.username?.contains).toBe('alice');
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await POST(makePost({ username: 'u', nickname: 'n' }));
    expect(res.status).toBe(403);
  });

  it('缺少用户名或昵称时返回 400', async () => {
    const res = await POST(makePost({ username: 'u' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('不能为空');
  });

  it('status 参数非法时返回 400', async () => {
    const res = await POST(makePost({ username: 'u', nickname: 'n', status: 9 }));
    expect(res.status).toBe(400);
  });

  it('用户名已存在时返回 400', async () => {
    mockFindFirst.mockResolvedValue({ id: 99 });
    const res = await POST(makePost({ username: 'alice', nickname: 'Alice' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('已存在');
  });

  it('角色不存在时返回 400', async () => {
    mockRoleFind.mockResolvedValue(null);
    const res = await POST(makePost({ username: 'u', nickname: 'n', role: 'GHOST' }));
    expect(res.status).toBe(400);
  });

  it('非超管尝试创建超管账号时返回 403', async () => {
    mockRoleFind.mockResolvedValue({ id: 1, name: 'SUPER_ADMIN' });
    const res = await POST(makePost({ username: 'u', nickname: 'n', role: 'SUPER_ADMIN' }));
    expect(res.status).toBe(403);
  });

  it('超管可以创建超管账号', async () => {
    mockRequirePermission.mockResolvedValue({ user: { ...ACTOR, role: 'SUPER_ADMIN' }, role: 'SUPER_ADMIN', permissions: [] });
    mockRoleFind.mockResolvedValue({ id: 1, name: 'SUPER_ADMIN' });
    mockUserCreate.mockResolvedValue({ ...RAW_USER, userRoles: [{ role: { name: 'SUPER_ADMIN' } }] });
    const res = await POST(makePost({ username: 'u', nickname: 'n', role: 'SUPER_ADMIN' }));
    expect(res.status).toBe(200);
  });

  it('成功创建用户并返回初始密码', async () => {
    const res = await POST(makePost({ username: 'newuser', nickname: 'New' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('initialPassword');
    expect(body.message).toContain('成功');
  });

  it('成功后写入审计日志', async () => {
    await POST(makePost({ username: 'newuser', nickname: 'New' }));
    expect(mockWriteAuditLog).toHaveBeenCalledOnce();
    expect(mockWriteAuditLog.mock.calls[0][0].action).toBe('user.create');
  });
});
