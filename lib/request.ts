import type { ApiResponse } from '@/types/request';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_GET_RETRIES = 1;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

type RequestErrorHandler = (error: Error, context: {
  url: string;
  method: RequestMethod;
  attempts: number;
}) => void;

interface RequestOptions {
  method?: RequestMethod;
  params?: Record<string, unknown>;
  data?: object;
  headers?: HeadersInit;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
  onError?: RequestErrorHandler;
}

let globalRequestErrorHandler: RequestErrorHandler | undefined;

export function setRequestErrorHandler(handler?: RequestErrorHandler) {
  globalRequestErrorHandler = handler;
}

function createError(message: string, retryable = false) {
  const error = new Error(message) as Error & { retryable?: boolean };
  error.retryable = retryable;
  return error;
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (error as Error & { retryable?: boolean }).retryable === true;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function notifyRequestError(
  error: Error,
  method: RequestMethod,
  requestUrl: string,
  attempts: number,
  localHandler?: RequestErrorHandler,
) {
  try {
    localHandler?.(error, { url: requestUrl, method, attempts });
  } catch {
    // 忽略钩子内部异常，避免覆盖原始请求错误。
  }

  try {
    globalRequestErrorHandler?.(error, { url: requestUrl, method, attempts });
  } catch {
    // 忽略钩子内部异常，避免覆盖原始请求错误。
  }
}

async function requestOnce<T = unknown>(
  requestUrl: string,
  method: RequestMethod,
  data: object | undefined,
  headers: HeadersInit | undefined,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<ApiResponse<T>> {
  const abortController = new AbortController();
  const onExternalAbort = () => abortController.abort(externalSignal?.reason);

  if (externalSignal?.aborted) {
    abortController.abort(externalSignal.reason);
  } else if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const normalizedHeaders =
      method === 'GET'
        ? { ...headers }
        : {
            'Content-Type': 'application/json',
            ...headers,
          };

    const response = await fetch(requestUrl, {
      method,
      headers: normalizedHeaders,
      body: method === 'GET' ? undefined : JSON.stringify(data),
      signal: abortController.signal,
    });

    let result: ApiResponse<T>;

    try {
      result = await response.json();
    } catch {
      throw createError('服务端返回格式异常');
    }

    if (!response.ok) {
      throw createError(
        result.message || '请求失败',
        RETRYABLE_STATUS.has(response.status),
      );
    }

    if (result.code !== 0) {
      throw createError(result.message || '业务处理失败');
    }

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw createError('请求超时，请稍后重试', true);
    }
    if (error instanceof Error) {
      const knownRetryable = (error as Error & { retryable?: boolean }).retryable;
      if (knownRetryable === undefined) {
        // Fetch 网络错误通常表现为普通 Error/TypeError，这里标记为可重试。
        throw createError(error.message || '请求失败', true);
      }
      throw error;
    }
    throw createError('请求失败');
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

function buildQueryString(params?: Record<string, unknown>) {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return;
    }

    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    params,
    data,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_GET_RETRIES,
    signal,
    onError,
  } = options;

  const requestUrl = `${url}${buildQueryString(params)}`;
  const maxRetries = method === 'GET' ? Math.max(0, retries) : 0;
  const totalAttempts = maxRetries + 1;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < totalAttempts) {
    try {
      return await requestOnce<T>(
        requestUrl,
        method,
        data,
        headers,
        timeoutMs,
        signal,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : createError('请求失败');
      attempt += 1;

      if (attempt >= totalAttempts || !isRetryableError(lastError)) {
        notifyRequestError(lastError, method, requestUrl, attempt, onError);
        throw lastError;
      }

      // 指数退避：200ms、400ms、800ms...
      await delay(200 * 2 ** (attempt - 1));
    }
  }

  const fallbackError = lastError ?? createError('请求失败');
  notifyRequestError(fallbackError, method, requestUrl, attempt, onError);
  throw fallbackError;
}
