import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from '@/lib/request';

function makeFetchResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('request', () => {
  it('成功请求返回响应体', async () => {
    vi.stubGlobal('fetch', () => makeFetchResponse({ code: 0, data: { id: 1 }, message: 'success' }));
    const result = await request('/api/users');
    expect(result.code).toBe(0);
    expect(result.data).toEqual({ id: 1 });
  });

  it('GET 请求不发送 body', async () => {
    const fetchMock = vi.fn(() => makeFetchResponse({ code: 0, data: null, message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/users', { method: 'GET' });
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).body).toBeUndefined();
  });

  it('POST 请求携带 JSON body', async () => {
    const fetchMock = vi.fn(() => makeFetchResponse({ code: 0, data: null, message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/users', { method: 'POST', data: { username: 'test' } });
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).body).toBe(JSON.stringify({ username: 'test' }));
  });

  it('params 构建查询字符串', async () => {
    const fetchMock = vi.fn(() => makeFetchResponse({ code: 0, data: null, message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/users', { params: { page: 1, username: 'alice' } });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('page=1');
    expect(url).toContain('username=alice');
  });

  it('params 中 null/undefined/空字符串 被过滤', async () => {
    const fetchMock = vi.fn(() => makeFetchResponse({ code: 0, data: null, message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/users', { params: { a: null, b: undefined, c: '', d: 'keep' } });
    const [url] = fetchMock.mock.calls[0];
    expect(url).not.toContain('a=');
    expect(url).not.toContain('b=');
    expect(url).not.toContain('c=');
    expect(url).toContain('d=keep');
  });

  it('HTTP 状态非 2xx 抛出错误（取 message 字段）', async () => {
    vi.stubGlobal('fetch', () => makeFetchResponse({ code: 1, data: null, message: '未登录' }, false, 401));
    await expect(request('/api/profile')).rejects.toThrow('未登录');
  });

  it('HTTP 状态非 2xx 且无 message 时抛出默认错误', async () => {
    vi.stubGlobal('fetch', () => makeFetchResponse({ code: 1, data: null, message: '' }, false, 500));
    await expect(request('/api/profile')).rejects.toThrow('请求失败');
  });

  it('code !== 0 时抛出业务错误', async () => {
    vi.stubGlobal('fetch', () => makeFetchResponse({ code: 1, data: null, message: '用户名已存在' }));
    await expect(request('/api/users', { method: 'POST' })).rejects.toThrow('用户名已存在');
  });

  it('JSON 解析失败时抛出格式异常', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as Response));
    await expect(request('/api/users')).rejects.toThrow('服务端返回格式异常');
  });
});
