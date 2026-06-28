import { describe, it, expect } from 'vitest';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

async function json(res: Response) {
  return res.json();
}

describe('apiSuccess', () => {
  it('返回 code=0，data 和 message', async () => {
    const res = apiSuccess({ id: 1 });
    const body = await json(res);
    expect(body.code).toBe(0);
    expect(body.data).toEqual({ id: 1 });
    expect(body.message).toBe('success');
    expect(res.status).toBe(200);
  });

  it('支持自定义 message', async () => {
    const res = apiSuccess(null, '创建成功');
    const body = await json(res);
    expect(body.message).toBe('创建成功');
  });
});

describe('apiError', () => {
  it('返回 code=1，data=null 和 message', async () => {
    const res = apiError('服务器错误');
    const body = await json(res);
    expect(body.code).toBe(1);
    expect(body.data).toBeNull();
    expect(body.message).toBe('服务器错误');
    expect(res.status).toBe(500);
  });

  it('支持自定义 HTTP 状态码', async () => {
    const res = apiError('未登录', 401);
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.message).toBe('未登录');
  });

  it('403 状态码', async () => {
    const res = apiError('无权限', 403);
    expect(res.status).toBe(403);
  });
});

describe('handleApiError', () => {
  it('未知错误返回 500', async () => {
    const res = handleApiError(new Error('some error'), '操作失败');
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.message).toBe('操作失败');
  });

  it('message 为 "未登录" 时返回 401', async () => {
    const res = handleApiError(new Error('未登录'), '操作失败');
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.message).toBe('未登录');
  });

  it('message 为 "无权限" 时返回 403', async () => {
    const res = handleApiError(new Error('无权限'), '操作失败');
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.message).toBe('无权限');
  });

  it('非 Error 类型的错误返回 fallbackMessage', async () => {
    const res = handleApiError('string error', '默认错误');
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.message).toBe('默认错误');
  });
});
