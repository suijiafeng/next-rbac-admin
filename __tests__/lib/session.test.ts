import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
  getAdminSessionCookieOptions,
  ADMIN_SESSION_COOKIE,
} from '@/lib/session';

const BASE_SESSION = {
  userId: 1,
  username: 'admin',
  nickname: '管理员',
  role: 'ADMIN',
  authVersion: 1,
};

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  delete process.env.AUTH_SECRET;
});

describe('ADMIN_SESSION_COOKIE', () => {
  it('常量值为 admin_session', () => {
    expect(ADMIN_SESSION_COOKIE).toBe('admin_session');
  });
});

describe('createAdminSessionToken', () => {
  it('生成包含两段的 token（payload.signature）', async () => {
    const token = await createAdminSessionToken(BASE_SESSION);
    const parts = token.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('payload 中包含 exp 字段', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createAdminSessionToken(BASE_SESSION);
    const [encodedPayload] = token.split('.');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    expect(payload.exp).toBeGreaterThan(before);
  });

  it('自定义 maxAge 影响 exp', async () => {
    const maxAge = 3600;
    const before = Math.floor(Date.now() / 1000);
    const token = await createAdminSessionToken(BASE_SESSION, maxAge);
    const [encodedPayload] = token.split('.');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    expect(payload.exp).toBeGreaterThanOrEqual(before + maxAge - 1);
    expect(payload.exp).toBeLessThanOrEqual(before + maxAge + 1);
  });
});

describe('verifyAdminSessionToken', () => {
  it('验证通过，返回正确 payload', async () => {
    const token = await createAdminSessionToken(BASE_SESSION);
    const result = await verifyAdminSessionToken(token);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe(BASE_SESSION.userId);
    expect(result?.username).toBe(BASE_SESSION.username);
    expect(result?.role).toBe(BASE_SESSION.role);
  });

  it('null token 返回 null', async () => {
    expect(await verifyAdminSessionToken(null)).toBeNull();
  });

  it('undefined token 返回 null', async () => {
    expect(await verifyAdminSessionToken(undefined)).toBeNull();
  });

  it('空字符串返回 null', async () => {
    expect(await verifyAdminSessionToken('')).toBeNull();
  });

  it('缺少签名段返回 null', async () => {
    expect(await verifyAdminSessionToken('onlypayload')).toBeNull();
  });

  it('签名被篡改返回 null', async () => {
    const token = await createAdminSessionToken(BASE_SESSION);
    const [payload] = token.split('.');
    const tampered = `${payload}.invalidsignature`;
    expect(await verifyAdminSessionToken(tampered)).toBeNull();
  });

  it('payload 被篡改返回 null', async () => {
    const token = await createAdminSessionToken(BASE_SESSION);
    const [, sig] = token.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ ...BASE_SESSION, userId: 999, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const tampered = `${fakePayload}.${sig}`;
    expect(await verifyAdminSessionToken(tampered)).toBeNull();
  });

  it('已过期的 token 返回 null', async () => {
    const token = await createAdminSessionToken(BASE_SESSION, -10);
    expect(await verifyAdminSessionToken(token)).toBeNull();
  });

  it('payload 格式非法返回 null', async () => {
    const badPayload = Buffer.from('not-json').toString('base64url');
    const fakeToken = `${badPayload}.fakesig`;
    expect(await verifyAdminSessionToken(fakeToken)).toBeNull();
  });
});

describe('getAdminSessionCookieOptions', () => {
  it('默认返回 httpOnly=true、sameSite=lax、path=/', () => {
    const opts = getAdminSessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
  });

  it('非生产环境 secure=false', () => {
    process.env.NODE_ENV = 'test';
    const opts = getAdminSessionCookieOptions();
    expect(opts.secure).toBe(false);
  });

  it('生产环境 secure=true', () => {
    process.env.NODE_ENV = 'production';
    const opts = getAdminSessionCookieOptions();
    expect(opts.secure).toBe(true);
    process.env.NODE_ENV = 'test';
  });

  it('自定义 maxAge 生效', () => {
    const opts = getAdminSessionCookieOptions(1800);
    expect(opts.maxAge).toBe(1800);
  });
});
