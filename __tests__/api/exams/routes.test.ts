import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_ATTEMPTS, DEMO_PAPERS } from '@/lib/exam/demo-data';

const { mockRequireAdminUser, mockRequirePermission, mockAuditCreate, examDb } = vi.hoisted(() => ({
  mockRequireAdminUser: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockAuditCreate: vi.fn(),
  examDb: {
    papers: [] as Array<Record<string, unknown>>,
    attempts: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock('@/lib/permission', () => ({
  requireAdminUser: mockRequireAdminUser,
  requirePermission: mockRequirePermission,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: { create: mockAuditCreate },
    examPaper: {
      findMany: async () => examDb.papers.map((paper) => ({ ...paper })),
      findUnique: async ({ where }: { where: { id: string } }) =>
        examDb.papers.find((paper) => paper.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const paper = examDb.papers.find((item) => item.id === where.id);
        if (!paper) throw new Error('missing');
        Object.assign(paper, data);
        return { ...paper };
      },
    },
    examAttempt: {
      findMany: async () => examDb.attempts.map((row) => ({ ...row })),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: examDb.attempts.length + 1, ...data };
        examDb.attempts.push(row);
        return row;
      },
    },
  },
}));

import { GET as listPapers } from '@/app/api/exams/papers/route';
import { POST as decidePaper } from '@/app/api/exams/papers/[id]/decision/route';
import { POST as submitAttempt } from '@/app/api/exams/attempts/route';
import { GET as getStats } from '@/app/api/exams/stats/route';

function resetExamDb() {
  examDb.papers = DEMO_PAPERS.map((paper) => ({ ...paper, questions: paper.questions }));
  examDb.attempts = DEMO_ATTEMPTS.map((attempt) => ({
    id: attempt.id,
    externalKey: attempt.id,
    paperId: attempt.paperId,
    paperTitle: attempt.paperTitle,
    username: 'seed',
    learnerLabel: attempt.learnerLabel,
    department: attempt.department,
    answers: {},
    earned: attempt.score,
    total: 100,
    passed: attempt.score >= 60,
    pointsAwarded: attempt.points,
    submittedAt: new Date(attempt.submittedAt),
    dataSource: '演示数据',
    seeded: true,
  }));
}

function asUser(role: string, username: string) {
  const user = { id: 1, username, role };
  mockRequireAdminUser.mockResolvedValue(user);
  mockRequirePermission.mockResolvedValue({ user, role, permissions: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetExamDb();
  mockAuditCreate.mockResolvedValue({});
});

describe('考试路由权限', () => {
  it('未登录时列表返回 401', async () => {
    mockRequireAdminUser.mockRejectedValue(new Error('未登录'));
    const res = await listPapers();
    expect(res.status).toBe(401);
  });

  it('学员只能看到已发布试卷，且没有标准答案字段', async () => {
    asUser('USER', 'user');
    const res = await listPapers();
    const body = await res.json();
    expect(body.data.actor).toBe('learner');
    expect(body.data.list.map((paper: { id: string }) => paper.id).sort()).toEqual(['demo-compare', 'demo-intro']);
    expect(JSON.stringify(body.data.list)).not.toContain('standard');
    expect(body.data.dataSource).toBe('演示数据');
  });

  it('学员不能审批，审核人可以通过待审批试卷', async () => {
    asUser('USER', 'user');
    const denied = await decidePaper(
      new Request('http://localhost/api/exams/papers/demo-pending/decision', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      }),
      { params: { id: 'demo-pending' } },
    );
    expect(denied.status).toBe(403);

    asUser('SUPER_ADMIN', 'super_admin');
    const approved = await decidePaper(
      new Request('http://localhost/api/exams/papers/demo-pending/decision', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      }),
      { params: { id: 'demo-pending' } },
    );
    const body = await approved.json();
    expect(approved.status).toBe(200);
    expect(body.data.paper.status).toBe('APPROVED');
    expect(mockAuditCreate).toHaveBeenCalledOnce();
    const stored = examDb.papers.find((paper) => paper.id === 'demo-pending');
    expect(stored?.status).toBe('APPROVED');
  });

  it('出题人不能通过自己的待审批试卷', async () => {
    asUser('ADMIN', 'admin');
    const res = await decidePaper(
      new Request('http://localhost/api/exams/papers/demo-pending/decision', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      }),
      { params: { id: 'demo-pending' } },
    );
    expect(res.status).toBe(403);
  });

  it('没有看板权限时统计接口返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await getStats(new Request('http://localhost/api/exams/stats'));
    expect(res.status).toBe(403);
  });

  it('看板接口按部门筛选后只返回该部门排名', async () => {
    mockRequirePermission.mockResolvedValue({
      user: { id: 2, username: 'admin' },
      role: 'ADMIN',
      permissions: [],
    });
    const res = await getStats(new Request('http://localhost/api/exams/stats?department=演示部门乙&range=30d'));
    const body = await res.json();
    expect(body.data.dataSource).toBe('演示数据');
    expect(body.data.ranking).toEqual([{ department: '演示部门乙', average: 48, count: 3 }]);
  });

  it('学员交卷由服务端判分，出题人不能交卷', async () => {
    asUser('ADMIN', 'admin');
    const blocked = await submitAttempt(new Request('http://localhost/api/exams/attempts', {
      method: 'POST',
      body: JSON.stringify({ paperId: 'demo-intro', answers: {} }),
    }));
    expect(blocked.status).toBe(403);

    asUser('USER', 'user');
    const res = await submitAttempt(new Request('http://localhost/api/exams/attempts', {
      method: 'POST',
      body: JSON.stringify({
        paperId: 'demo-intro',
        answers: {
          'q-role': { questionId: 'q-role', payload: { type: 'single', optionId: 'role' }, updatedAt: 1 },
          'q-actions': { questionId: 'q-actions', payload: { type: 'multiple', optionIds: ['view', 'edit'] }, updatedAt: 1 },
          'q-approve': { questionId: 'q-approve', payload: { type: 'boolean', value: false }, updatedAt: 1 },
          'q-author': { questionId: 'q-author', payload: { type: 'blank', text: 'suijiafeng' }, updatedAt: 1 },
        },
      }),
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.grade.earned).toBe(100);
    expect(body.data.grade.dataSource).toBe('演示数据');
  });
});
