import { prisma } from '@/lib/prisma';
import { getCurrentAdminAuth, requireAdminUser } from '@/lib/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authInfo = await getCurrentAdminAuth();

    return apiSuccess(authInfo);
  } catch (error) {
    return handleApiError(error, '获取个人信息失败', 'GET /api/profile error');
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await requireAdminUser();

    const body = await request.json();
    const { nickname, email } = body;

    if (!nickname) {
      return apiError('昵称不能为空', 400);
    }

    const existedUser = email
      ? await prisma.user.findFirst({
          where: {
            email,
            NOT: {
              id: currentUser.id,
            },
          },
        })
      : null;

    if (existedUser) {
      return apiError('邮箱已存在', 400);
    }

    const user = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        nickname,
        email: email || null,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(user, '保存成功');
  } catch (error) {
    return handleApiError(error, '更新个人信息失败', 'PUT /api/profile error');
  }
}
