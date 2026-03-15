import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRole(['SUPER_ADMIN']);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)));
    const action = searchParams.get('action') || '';

    const where = action ? { action } : {};

    const [list, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      code: 0,
      data: { list, total, page, pageSize },
      message: 'success',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '未登录') {
        return NextResponse.json({ code: 1, data: null, message: '未登录' }, { status: 401 });
      }
      if (error.message === '无权限') {
        return NextResponse.json({ code: 1, data: null, message: '无权限' }, { status: 403 });
      }
    }
    console.error('GET /api/admin/audit-logs error:', error);
    return NextResponse.json({ code: 1, data: null, message: '获取审计日志失败' }, { status: 500 });
  }
}
