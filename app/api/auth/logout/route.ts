import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    code: 0,
    data: true,
    message: '退出成功',
  });

  response.cookies.set('admin_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}