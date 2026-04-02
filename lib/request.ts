import type { ApiResponse } from '@/types/request';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  params?: Record<string, unknown>;
  data?: object;
  headers?: HeadersInit;
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
  } = options;

  const requestUrl = `${url}${buildQueryString(params)}`;

  const response = await fetch(requestUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: method === 'GET' ? undefined : JSON.stringify(data),
  });

  let result: ApiResponse<T>;

  try {
    result = await response.json();
  } catch {
    throw new Error('服务端返回格式异常');
  }

  if (!response.ok) {
    throw new Error(result.message || '请求失败');
  }

  if (result.code !== 0) {
    throw new Error(result.message || '业务处理失败');
  }

  return result;
}
