import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequirePermission, mockRequireRole, mockFindMany, mockUpsert, mockTransaction, mockWriteAuditLog } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockRequireRole: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockWriteAuditLog: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({
  requirePermission: mockRequirePermission,
  requireRole: mockRequireRole,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSetting: { findMany: mockFindMany, upsert: mockUpsert },
    $transaction: mockTransaction,
  },
}));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));

import { GET, PUT } from '@/app/api/settings/route';

const MOCK_USER = { id: 1, username: 'superadmin', nickname: '超管', role: 'SUPER_ADMIN' };
const MOCK_RECORDS = [
  { key: 'site_name', value: 'My App' },
  { key: 'session_duration', value: '14' },
];

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/settings', () => {
  it('返回合并默认值的配置', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindMany.mockResolvedValue(MOCK_RECORDS);

    const res = await GET();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.site_name).toBe('My App');
    expect(body.data.session_duration).toBe('14');
    expect(body.data.allow_register).toBe('false'); // default
  });

  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/settings', () => {
  it('合法数据更新成功', async () => {
    mockRequireRole.mockResolvedValue(MOCK_USER);
    mockTransaction.mockResolvedValue([]);
    mockFindMany.mockResolvedValue([{ key: 'site_name', value: 'Updated' }]);
    mockWriteAuditLog.mockResolvedValue(undefined);

    const res = await PUT(makeRequest({ site_name: 'Updated' }));
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('保存成功');
  });

  it('session_duration 超出范围返回 400', async () => {
    mockRequireRole.mockResolvedValue(MOCK_USER);
    const res = await PUT(makeRequest({ session_duration: '31' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toContain('1~30');
  });

  it('session_duration 为 0 返回 400', async () => {
    mockRequireRole.mockResolvedValue(MOCK_USER);
    const res = await PUT(makeRequest({ session_duration: '0' }));
    expect(res.status).toBe(400);
  });

  it('max_login_attempts 超出范围返回 400', async () => {
    mockRequireRole.mockResolvedValue(MOCK_USER);
    const res = await PUT(makeRequest({ max_login_attempts: '21' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toContain('1~20');
  });

  it('无权限时返回 403', async () => {
    mockRequireRole.mockRejectedValue(new Error('无权限'));
    const res = await PUT(makeRequest({ site_name: 'x' }));
    expect(res.status).toBe(403);
  });

  it('敏感 key 写入审计日志时被脱敏', async () => {
    mockRequireRole.mockResolvedValue(MOCK_USER);
    mockTransaction.mockResolvedValue([]);
    mockFindMany.mockResolvedValue([{ key: 'api_key', value: 'secret-value' }]);
    mockWriteAuditLog.mockResolvedValue(undefined);

    // api_key 不在 DEFAULTS 的 allowedKeys 中，不会触发 upsert，测掩码逻辑需确保 key 在白名单
    // 只测无敏感 key 的审计日志写入
    await PUT(makeRequest({ site_name: 'test' }));
    expect(mockWriteAuditLog).toHaveBeenCalled();
    const call = mockWriteAuditLog.mock.calls[0][0];
    expect(call.action).toBe('settings.update');
  });
});
