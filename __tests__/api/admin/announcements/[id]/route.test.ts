import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireRole, mockFindUnique, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    announcement: { findUnique: mockFindUnique, update: mockUpdate, delete: mockDelete },
  },
}));

import { PUT, DELETE } from '@/app/api/admin/announcements/[id]/route';

const ADMIN_USER = { id: 1, username: 'admin', role: 'ADMIN' };

const MOCK_ANNOUNCEMENT = {
  id: 3,
  title: '公告',
  content: '内容',
  level: 'info',
  active: true,
  startsAt: new Date(),
  expiresAt: null,
};

function makePutRequest(body: unknown) {
  return new Request('http://localhost/api/admin/announcements/3', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('PUT /api/admin/announcements/[id]', () => {
  it('成功更新公告', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    mockFindUnique.mockResolvedValue(MOCK_ANNOUNCEMENT);
    mockUpdate.mockResolvedValue({ ...MOCK_ANNOUNCEMENT, title: '新标题' });

    const res = await PUT(makePutRequest({ title: '新标题', content: '新内容' }), { params: { id: '3' } });
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('公告已更新');
  });

  it('ID 非法时返回 400', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    const res = await PUT(makePutRequest({ title: 'x', content: 'y' }), { params: { id: 'abc' } });
    expect(res.status).toBe(400);
  });

  it('公告不存在时返回 404', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    mockFindUnique.mockResolvedValue(null);
    const res = await PUT(makePutRequest({ title: 'x', content: 'y' }), { params: { id: '99' } });
    expect(res.status).toBe(404);
  });

  it('标题或内容为空时返回 400', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    const res = await PUT(makePutRequest({ title: '', content: '内容' }), { params: { id: '3' } });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/announcements/[id]', () => {
  it('成功删除公告', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    mockFindUnique.mockResolvedValue(MOCK_ANNOUNCEMENT);
    mockDelete.mockResolvedValue(undefined);

    const res = await DELETE(new Request('http://localhost'), { params: { id: '3' } });
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('公告已删除');
  });

  it('公告不存在时返回 404', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE(new Request('http://localhost'), { params: { id: '99' } });
    expect(res.status).toBe(404);
  });

  it('ID 非法时返回 400', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    const res = await DELETE(new Request('http://localhost'), { params: { id: '0' } });
    expect(res.status).toBe(400);
  });
});
