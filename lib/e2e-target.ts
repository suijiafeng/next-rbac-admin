/**
 * Playwright 的访问地址。
 * 未设置时仍是本机 3000。PORT 改端口；BASE_URL 指定完整源（优先于 PORT）。
 */
export function resolvePlaywrightTarget(
  env: { PORT?: string; BASE_URL?: string } = {
    PORT: process.env.PORT,
    BASE_URL: process.env.BASE_URL,
  },
): { baseURL: string; port: string } {
  const envPort = env.PORT?.trim();
  const fallbackPort = envPort || '3000';
  const rawBase = env.BASE_URL?.trim();

  if (!rawBase) {
    return { baseURL: `http://127.0.0.1:${fallbackPort}`, port: fallbackPort };
  }

  try {
    const url = new URL(rawBase);
    const baseURL = rawBase.replace(/\/$/, '');
    const port = url.port || envPort || (url.protocol === 'https:' ? '443' : '80');
    return { baseURL, port };
  } catch {
    return { baseURL: `http://127.0.0.1:${fallbackPort}`, port: fallbackPort };
  }
}
