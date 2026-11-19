import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

export interface HttpDeps {
  notify?: (message: string) => void;
  redirect?: (url: string) => void;
  baseURL?: string;
}

type KeyedConfig = InternalAxiosRequestConfig & { dedupeKey?: string };

export function requestKey(config: {
  method?: string;
  url?: string;
  params?: unknown;
  data?: unknown;
}): string {
  return [
    (config.method || 'get').toLowerCase(),
    config.url || '',
    stable(config.params),
    stable(typeof config.data === 'string' ? parseMaybe(config.data) : config.data),
  ].join('|');
}

function parseMaybe(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stable(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => stable(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${key}:${stable(record[key])}`)
    .join(',')}}`;
}

function release(inflight: Map<string, AbortController>, config?: KeyedConfig) {
  if (!config?.dedupeKey) return;
  const current = inflight.get(config.dedupeKey);
  if (current && current.signal === config.signal) {
    inflight.delete(config.dedupeKey);
  }
}

async function defaultNotify(message: string) {
  if (typeof window === 'undefined') return;
  const { message: antdMessage } = await import('antd');
  antdMessage.error(message);
}

function defaultRedirect(url: string) {
  if (typeof window === 'undefined') return;
  window.location.assign(url);
}

/**
 * axios 实例：401 跳登录，业务 code !== 0 统一提示，相同 method+url+params+data 取消上一次。
 */
export function createHttpClient(deps: HttpDeps = {}): AxiosInstance {
  const notify = deps.notify ?? defaultNotify;
  const redirect = deps.redirect ?? defaultRedirect;
  const inflight = new Map<string, AbortController>();
  const client = axios.create({
    baseURL: deps.baseURL ?? '',
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const keyed = config as KeyedConfig;
    const key = requestKey(keyed);
    const previous = inflight.get(key);
    if (previous) previous.abort();
    const controller = new AbortController();
    keyed.signal = controller.signal;
    keyed.dedupeKey = key;
    inflight.set(key, controller);
    return keyed;
  });

  client.interceptors.response.use(
    (response) => {
      release(inflight, response.config as KeyedConfig);
      const body = response.data as { code?: number; message?: string } | undefined;
      if (body && typeof body === 'object' && typeof body.code === 'number' && body.code !== 0) {
        const message = body.message || '业务处理失败';
        void notify(message);
        return Promise.reject(new Error(message));
      }
      return response;
    },
    (error: AxiosError<{ message?: string }>) => {
      release(inflight, error.config as KeyedConfig | undefined);
      if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
        return Promise.reject(error);
      }
      if (error.response?.status === 401) {
        redirect('/login');
      }
      const message = error.response?.data?.message || error.message || '请求失败';
      void notify(message);
      return Promise.reject(error);
    },
  );

  return client;
}

export const http = createHttpClient();
