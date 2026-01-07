import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ROLE_VIEW);

    const permissions = await prisma.permission.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, code: true, name: true, description: true },
    });

    return NextResponse.json({ code: 0, data: permissions, message: 'success' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '未登录')
        return NextResponse.json({ code: 1, data: null, message: '未登录' }, { status: 401 });
      if (error.message === '无权限')
        return NextResponse.json({ code: 1, data: null, message: '无权限' }, { status: 403 });
    }
    return NextResponse.json({ code: 1, data: null, message: '获取权限列表失败' }, { status: 500 });
  }
}
