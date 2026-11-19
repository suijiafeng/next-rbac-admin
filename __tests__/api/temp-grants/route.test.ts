import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  require: vi.fn(), transaction: vi.fn(), target: vi.fn(), role: vi.fn(), upsert: vi.fn(), grant: vi.fn(), audit: vi.fn(),
  outsideUpsert: vi.fn(), outsideGrant: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: {
  $transaction: mocks.transaction, userRole: { upsert: mocks.outsideUpsert }, tempGrant: { create: mocks.outsideGrant },
} }));
vi.mock('@/lib/permission', () => ({ requirePermission: mocks.require }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog: mocks.audit }));
vi.mock('@/lib/temp-grant', () => ({ expireDueGrants: vi.fn() }));
import { POST } from '@/app/api/temp-grants/route';
const tx = { user: { findUnique: mocks.target }, role: { findUnique: mocks.role }, userRole: { upsert: mocks.upsert }, tempGrant: { create: mocks.grant } };
const body = { targetUserId: 7, grantedRole: 'ADMIN', hours: 1, reason: '临时处理工单', businessHoursOnly: false };
const send = (value: unknown) => POST(new Request('http://localhost/api/temp-grants', { method: 'POST', body: JSON.stringify(value) }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.require.mockResolvedValue({ user: { id: 1, username: 'super' } });
  mocks.transaction.mockImplementation(async (work) => work(tx));
  mocks.target.mockResolvedValue({ id: 7, username: 'reader', userRoles: [{ role: { name: 'USER' } }] });
  mocks.role.mockResolvedValue({ id: 2, name: 'ADMIN' });
  mocks.grant.mockResolvedValue({ id: 1, username: 'reader' });
});

describe('临时授权事务边界', () => {
  it.each([null, [], { ...body, reason: {} }, { ...body, businessHoursOnly: 'false' }, { ...body, targetUserId: 1.5 }, { ...body, hours: '1' }])('非法类型在任何写入前被拒绝：%j', async (input) => {
    expect((await send(input)).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('角色、授权记录及审计在同一串行化事务中写入', async () => {
    expect((await send(body)).status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(mocks.upsert).toHaveBeenCalledOnce();
    expect(mocks.grant).toHaveBeenCalledOnce();
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'temp.grant', targetId: 7 }), tx);
    expect(mocks.outsideUpsert).not.toHaveBeenCalled();
    expect(mocks.outsideGrant).not.toHaveBeenCalled();
  });
  it('授权记录写入失败时向事务抛错，不继续写审计', async () => {
    mocks.grant.mockRejectedValue(new Error('write failed'));
    expect((await send(body)).status).toBe(500);
    expect(mocks.audit).not.toHaveBeenCalled();
    const transactionResult = mocks.transaction.mock.results[0].value;
    await expect(transactionResult).rejects.toThrow('write failed');
  });
  it('事务审计失败同样失败，不能返回授权成功', async () => {
    mocks.audit.mockRejectedValue(new Error('audit failed'));
    expect((await send(body)).status).toBe(500);
    await expect(mocks.transaction.mock.results[0].value).rejects.toThrow('audit failed');
  });
  it('并发串行化冲突返回409', async () => {
    mocks.transaction.mockRejectedValue({ code: 'P2034' });
    expect((await send(body)).status).toBe(409);
  });
  it('不存在/已是管理员的目标不写入', async () => {
    mocks.target.mockResolvedValueOnce(null);
    expect((await send(body)).status).toBe(404);
    mocks.target.mockResolvedValueOnce({ id: 7, username: 'reader', userRoles: [{ role: { name: 'ADMIN' } }] });
    expect((await send(body)).status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
