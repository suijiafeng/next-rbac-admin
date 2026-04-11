import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T, message = 'success') {
  return NextResponse.json({
    code: 0,
    data,
    message,
  });
}

export function apiError(message: string, status = 500) {
  return NextResponse.json(
    {
      code: 1,
      data: null,
      message,
    },
    {
      status,
    },
  );
}

export function handleApiError(
  error: unknown,
  fallbackMessage: string,
  logLabel?: string,
) {
  if (logLabel) {
    console.error(`${logLabel}:`, error);
  }

  if (error instanceof Error) {
    if (error.message === '未登录') {
      return apiError('未登录', 401);
    }

    if (error.message === '无权限') {
      return apiError('无权限', 403);
    }
  }

  return apiError(fallbackMessage, 500);
}
