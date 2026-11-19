import { describe, expect, it } from 'vitest';
import { resolvePlaywrightTarget } from '@/lib/e2e-target';

describe('resolvePlaywrightTarget', () => {
  it('默认仍是本机 3000', () => {
    expect(resolvePlaywrightTarget({})).toEqual({
      baseURL: 'http://127.0.0.1:3000',
      port: '3000',
    });
  });

  it('PORT 同时决定地址和启动端口', () => {
    expect(resolvePlaywrightTarget({ PORT: '3100' })).toEqual({
      baseURL: 'http://127.0.0.1:3100',
      port: '3100',
    });
  });

  it('BASE_URL 优先，并采用其中的端口', () => {
    expect(
      resolvePlaywrightTarget({
        PORT: '3100',
        BASE_URL: 'http://127.0.0.1:3200/',
      }),
    ).toEqual({
      baseURL: 'http://127.0.0.1:3200',
      port: '3200',
    });
  });

  it('BASE_URL 没有端口时沿用 PORT', () => {
    expect(resolvePlaywrightTarget({ PORT: '3100', BASE_URL: 'http://example.test' })).toEqual({
      baseURL: 'http://example.test',
      port: '3100',
    });
  });

  it('BASE_URL 无法解析时退回 PORT', () => {
    expect(resolvePlaywrightTarget({ PORT: '3100', BASE_URL: 'not a url' })).toEqual({
      baseURL: 'http://127.0.0.1:3100',
      port: '3100',
    });
  });
});
