import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, setRequestErrorHandler } from '@/lib/request';

function makeFetchResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
  setRequestErrorHandler(undefined);
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

  it('params 为空对象时 URL 无查询字符串', async () => {
    const fetchMock = vi.fn(() => makeFetchResponse({ code: 0, data: null, message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/users', { params: {} });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/users');
  });

  it('不传 params 时 URL 无查询字符串', async () => {
    const fetchMock = vi.fn(() => makeFetchResponse({ code: 0, data: null, message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/users');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/users');
  });

  it('code !== 0 且 message 为空时抛出默认业务错误文案', async () => {
    vi.stubGlobal('fetch', () => makeFetchResponse({ code: 1, data: null, message: '' }));
    await expect(request('/api/users')).rejects.toThrow('业务处理失败');
  });

  it('自定义 headers 被合并到请求中', async () => {
    const fetchMock = vi.fn(() => makeFetchResponse({ code: 0, data: null, message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/users', { headers: { 'X-Custom': 'value' } });
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ 'X-Custom': 'value' });
  });

  it('JSON 解析失败时抛出格式异常', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as Response));
    await expect(request('/api/users')).rejects.toThrow('服务端返回格式异常');
  });

  it('GET 请求遇到可重试错误会自动重试并成功', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { ok: true }, message: 'ok' }),
      } as Response);

    vi.stubGlobal('fetch', fetchMock);
    const result = await request('/api/retry-success');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ ok: true });
  });

  it('非 GET 请求默认不重试', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      request('/api/retry-post', { method: 'POST', data: { a: 1 } }),
    ).rejects.toThrow('network error');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('超时会中断请求并返回统一超时文案', async () => {
    const fetchMock = vi.fn((_: string, init?: RequestInit) =>
      new Promise((_, reject) => {
        const signal = init?.signal as AbortSignal;
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(request('/api/timeout', { timeoutMs: 10, retries: 0 })).rejects.toThrow(
      '请求超时，请稍后重试',
    );
  });

  it('请求失败时会调用全局错误钩子', async () => {
    const errorHandler = vi.fn();
    setRequestErrorHandler(errorHandler);
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));

    await expect(request('/api/hook-test', { retries: 0 })).rejects.toThrow('offline');

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        url: '/api/hook-test',
        method: 'GET',
        attempts: 1,
      }),
    );
  });

  it('请求失败时会调用当前请求的错误钩子', async () => {
    const onError = vi.fn();
    vi.stubGlobal('fetch', () => Promise.reject(new Error('boom')));

    await expect(request('/api/local-hook', { retries: 0, onError })).rejects.toThrow('boom');

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        url: '/api/local-hook',
        method: 'GET',
        attempts: 1,
      }),
    );
  });
});
