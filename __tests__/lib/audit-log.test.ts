import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeAuditLog } from '@/lib/audit-log';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { auditLog: { create: mockCreate } },
}));

beforeEach(() => vi.clearAllMocks());

describe('writeAuditLog', () => {
  it('写入审计日志，detail 被序列化为 JSON 字符串', async () => {
    mockCreate.mockResolvedValue({});
    await writeAuditLog({
      actorId: 1,
      actorUsername: 'admin',
      action: 'user.create',
      targetType: 'user',
      targetId: 42,
      targetLabel: 'alice',
      detail: { role: 'USER' },
    });
    expect(mockCreate).toHaveBeenCalledOnce();
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.detail).toBe(JSON.stringify({ role: 'USER' }));
  });

  it('targetId 被转换为字符串', async () => {
    mockCreate.mockResolvedValue({});
    await writeAuditLog({
      actorId: 1,
      actorUsername: 'admin',
      action: 'user.delete',
      targetType: 'user',
      targetId: 99,
    });
    expect(mockCreate.mock.calls[0][0].data.targetId).toBe('99');
  });

  it('targetId 为 null 时存 null', async () => {
    mockCreate.mockResolvedValue({});
    await writeAuditLog({
      actorId: 1,
      actorUsername: 'admin',
      action: 'settings.update',
      targetType: 'settings',
      targetId: null,
    });
    expect(mockCreate.mock.calls[0][0].data.targetId).toBeNull();
  });

  it('detail 为 undefined 时存 null', async () => {
    mockCreate.mockResolvedValue({});
    await writeAuditLog({
      actorId: 1,
      actorUsername: 'admin',
      action: 'user.login',
      targetType: 'user',
    });
    expect(mockCreate.mock.calls[0][0].data.detail).toBeNull();
  });

  it('actorId 为 null 时正常写入', async () => {
    mockCreate.mockResolvedValue({});
    await writeAuditLog({
      actorId: null,
      actorUsername: 'anonymous',
      action: 'user.login',
      targetType: 'user',
    });
    expect(mockCreate.mock.calls[0][0].data.actorId).toBeNull();
  });

  it('写入失败时不抛出异常（错误被吞掉）', async () => {
    mockCreate.mockRejectedValue(new Error('DB connection failed'));
    await expect(
      writeAuditLog({ actorId: 1, actorUsername: 'admin', action: 'user.create', targetType: 'user' }),
    ).resolves.toBeUndefined();
  });
});
