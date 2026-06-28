import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockFindUnique,
  mockFindFirst,
  mockRoleFind,
  mockUserCreate,
  mockBcryptHash,
  mockIsLockedOut,
  mockRecordFailed,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockRoleFind: vi.fn(),
  mockUserCreate: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockIsLockedOut: vi.fn(),
  mockRecordFailed: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSetting: { findUnique: mockFindUnique },
    user: { findFirst: mockFindFirst, create: mockUserCreate },
    role: { findUnique: mockRoleFind },
  },
}));
vi.mock('bcryptjs', () => ({ default: { hash: mockBcryptHash } }));
vi.mock('@/lib/login-attempt', () => ({
  isLockedOut: mockIsLockedOut,
  recordFailedAttempt: mockRecordFailed,
  LOCKOUT_DURATION_MINUTES: 15,
}));

import { POST } from '@/app/api/auth/register/route';

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const VALID_BODY = {
  username: 'newuser',
  nickname: '新用户',
  password: 'pass123',
  confirmPassword: 'pass123',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsLockedOut.mockResolvedValue(false);
  mockFindUnique.mockResolvedValue({ value: 'true' }); // allow_register=true
  mockFindFirst.mockResolvedValue(null);               // 用户不存在
  mockRoleFind.mockResolvedValue({ id: 1, name: 'USER' });
  mockBcryptHash.mockResolvedValue('hashed-password');
  mockUserCreate.mockResolvedValue({ id: 1, ...VALID_BODY, email: null });
});

describe('POST /api/auth/register', () => {
  it('IP 被锁定时返回 429', async () => {
    mockIsLockedOut.mockResolvedValue(true);
    const res = await POST(makeRequest(VALID_BODY, { 'x-forwarded-for': '1.2.3.4' }));
    expect(res.status).toBe(429);
  });

  it('设备令牌被锁定时返回 429', async () => {
    mockIsLockedOut.mockImplementation((key: string) =>
      Promise.resolve(key.startsWith('register_dev:')),
    );
    const res = await POST(makeRequest(VALID_BODY, {
      'x-device-token': '550e8400-e29b-41d4-a716-446655440000',
    }));
    expect(res.status).toBe(429);
  });

  it('系统未开放注册时返回 403', async () => {
    mockFindUnique.mockResolvedValue({ value: 'false' });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain('未开放注册');
  });

  it('缺少必填字段时返回 400', async () => {
    const res = await POST(makeRequest({ username: 'u' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('不能为空');
  });

  it('两次密码不一致时返回 400', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, confirmPassword: 'different' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('不一致');
  });

  it('密码少于 6 位时返回 400', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, password: '123', confirmPassword: '123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('6 位');
  });

  it('用户名已存在时记录失败并返回 400', async () => {
    mockFindFirst.mockResolvedValue({ id: 99 });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(400);
    expect(mockRecordFailed).toHaveBeenCalled();
    const body = await res.json();
    expect(body.message).toContain('已存在');
  });

  it('默认角色不存在时返回 500', async () => {
    mockRoleFind.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it('注册成功返回 200 并提示等待审核', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toContain('审核');
  });

  it('无效格式的 x-device-token 被忽略（不参与锁定检查）', async () => {
    mockIsLockedOut.mockImplementation((key: string) =>
      Promise.resolve(key.startsWith('register_dev:')),
    );
    const res = await POST(makeRequest(VALID_BODY, { 'x-device-token': 'not-a-uuid' }));
    // IP 锁定走的是 register_ip: 前缀，不会被触发
    expect(res.status).toBe(200);
  });
});
