import { describe, expect, it, vi } from 'vitest';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { createHttpClient, requestKey } from '@/lib/http/client';

function ok(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { data, status, statusText: 'OK', headers: {}, config };
}

describe('requestKey', () => {
  it('相同 method、url、params、data 得到同一个 key', () => {
    const left = requestKey({ method: 'GET', url: '/api/goods', params: { stage: 'entry' }, data: { sku: 'a' } });
    const right = requestKey({ method: 'get', url: '/api/goods', params: { stage: 'entry' }, data: { sku: 'a' } });
    expect(left).toBe(right);
    expect(requestKey({ method: 'GET', url: '/api/goods', params: { stage: 'review' } })).not.toBe(left);
  });
});

describe('axios 拦截器', () => {
  it('401 时跳转登录', async () => {
    const redirects: string[] = [];
    const notices: string[] = [];
    const client = createHttpClient({
      redirect: (url) => redirects.push(url),
      notify: (message) => notices.push(message),
    });
    client.defaults.adapter = async (config) => {
      throw new axios.AxiosError('未登录', 'ERR_BAD_REQUEST', config, null, {
        data: { code: 1, message: '未登录' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      });
    };
    await expect(client.get('/api/goods')).rejects.toBeTruthy();
    expect(redirects).toEqual(['/login']);
    expect(notices).toContain('未登录');
  });

  it('业务 code 非 0 时统一提示', async () => {
    const notices: string[] = [];
    const client = createHttpClient({ notify: (message) => notices.push(message) });
    client.defaults.adapter = async (config) => ok(config, { code: 1, message: '库存不能为负' }, 200);
    await expect(client.post('/api/goods', { stock: -1 })).rejects.toThrow('库存不能为负');
    expect(notices).toEqual(['库存不能为负']);
  });

  it('重复请求会取消上一次', async () => {
    const calls: InternalAxiosRequestConfig[] = [];
    const release: Array<() => void> = [];
    const client = createHttpClient({ notify: () => undefined });
    client.defaults.adapter = (config) => new Promise((resolve, reject) => {
      calls.push(config);
      const signal = config.signal as AbortSignal | undefined;
      if (!signal) {
        reject(new Error('missing signal'));
        return;
      }
      const cancel = () => reject(new axios.CanceledError('canceled'));
      if (signal.aborted) {
        cancel();
        return;
      }
      signal.addEventListener('abort', cancel, { once: true });
      release.push(() => {
        signal.removeEventListener('abort', cancel);
        resolve(ok(config, { code: 0, data: { ok: true }, message: 'ok' }));
      });
    });

    const first = client.get('/api/goods', { params: { stage: 'entry' } });
    const firstSettled = first.then(
      () => 'resolved',
      () => 'canceled',
    );
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const second = client.get('/api/goods', { params: { stage: 'entry' } });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].signal?.aborted).toBe(true);
    expect(calls[1].signal?.aborted).toBe(false);
    release[1]?.();
    await expect(second).resolves.toMatchObject({ data: { code: 0 } });
    expect(await firstSettled).toBe('canceled');
  });
});
