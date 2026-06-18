import { prisma } from '@/lib/prisma';
import { requireRole, requireAdminUser } from '@/lib/permission';
import { Role } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { parsePagination } from '@/lib/pagination';
import { normalizeAnnouncementLevel } from '@/constants/announcement';

export const dynamic = 'force-dynamic';

/** GET - 列表（所有已登录用户可查看生效公告；管理员查看全部） */
export async function GET(request: Request) {
  try {
    const currentUser = await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams);
    const onlyActive = searchParams.get('active') === 'true';

    const now = new Date();
    const where = onlyActive
      ? {
          active: true,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        }
      : {};

    void currentUser;

    const [list, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.announcement.count({ where }),
    ]);

    return apiSuccess({ list, total, page, pageSize });
  } catch (error) {
    return handleApiError(error, '获取公告列表失败', 'GET /api/admin/announcements error');
  }
}

/** POST - 创建（ADMIN/SUPER_ADMIN） */
export async function POST(request: Request) {
  try {
    const currentUser = await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);

    const body = await request.json();
    const { title, content, level, active, startsAt, expiresAt } = body;

    if (!title || !content) {
      return apiError('标题和内容不能为空', 400);
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        level: normalizeAnnouncementLevel(level),
        publisherId: currentUser.id,
        publisherUsername: currentUser.username,
        active: active !== false,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return apiSuccess(announcement, '公告已发布');
  } catch (error) {
    return handleApiError(error, '创建公告失败', 'POST /api/admin/announcements error');
  }
}
