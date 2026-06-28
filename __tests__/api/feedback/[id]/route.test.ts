import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireAdminUser, mockFeedbackFindUnique, mockFeedbackReadUpsert } = vi.hoisted(() => ({
  mockRequireAdminUser: vi.fn(),
  mockFeedbackFindUnique: vi.fn(),
  mockFeedbackReadUpsert: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireAdminUser: mockRequireAdminUser }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feedback: { findUnique: mockFeedbackFindUnique },
    feedbackRead: { upsert: mockFeedbackReadUpsert },
  },
}));

import { GET } from '@/app/api/feedback/[id]/route';

const SUPER_USER = {
  id: 1,
  username: 'super',
  nickname: '超管',
  role: 'SUPER_ADMIN',
  status: 1,
  authVersion: 1,
  email: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ADMIN_USER = { ...SUPER_USER, id: 2, username: 'admin', role: 'ADMIN' };

const MOCK_FEEDBACK = {
  id: 5,
  submitterRole: 'ADMIN',
  submitterId: 2,
  title: '测试',
  content: '内容',
};

function makeRequest() {
  return new Request('http://localhost/api/feedback/5');
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/feedback/[id]', () => {
  it('SUPER_ADMIN 可查看 ADMIN 提交的反馈', async () => {
    mockRequireAdminUser.mockResolvedValue(SUPER_USER);
    mockFeedbackFindUnique.mockResolvedValue(MOCK_FEEDBACK);
    mockFeedbackReadUpsert.mockResolvedValue(undefined);

    const res = await GET(makeRequest(), { params: { id: '5' } });
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.id).toBe(5);
  });

  it('ADMIN 无法查看同级或高级的反馈（无权限）', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
    mockFeedbackFindUnique.mockResolvedValue({ ...MOCK_FEEDBACK, submitterRole: 'SUPER_ADMIN' });

    const res = await GET(makeRequest(), { params: { id: '5' } });
    expect(res.status).toBe(403);
  });

  it('反馈不存在时返回 404', async () => {
    mockRequireAdminUser.mockResolvedValue(SUPER_USER);
    mockFeedbackFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: { id: '99' } });
    expect(res.status).toBe(404);
  });

  it('ID 非法时返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(SUPER_USER);
    const res = await GET(makeRequest(), { params: { id: 'abc' } });
    expect(res.status).toBe(400);
  });

  it('未登录时返回 401', async () => {
    mockRequireAdminUser.mockRejectedValue(new Error('未登录'));
    const res = await GET(makeRequest(), { params: { id: '5' } });
    expect(res.status).toBe(401);
  });
});
