import { prisma } from '@/lib/prisma';
import { requirePermission, requireRole } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { writeAuditLog } from '@/lib/audit-log';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// 默认设置值
const DEFAULTS: Record<string, string> = {
  site_name: 'Next Admin',
  site_description: '后台管理系统',
  site_logo: '',
  session_duration: '7',
  max_login_attempts: '5',
  allow_register: 'false',
  maintenance_mode: 'false',
};

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.SETTINGS_VIEW);

    const records = await prisma.systemSetting.findMany();

    const settings: Record<string, string> = { ...DEFAULTS };
    for (const record of records) {
      settings[record.key] = record.value;
    }

    return apiSuccess(settings);
  } catch (error) {
    return handleApiError(error, '获取设置失败', 'GET /api/settings error');
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await requireRole(['SUPER_ADMIN']);

    const body = await request.json();
    const allowedKeys = Object.keys(DEFAULTS);

    // 校验数值字段
    if (body.session_duration !== undefined) {
      const v = Number(body.session_duration);
      if (!Number.isInteger(v) || v < 1 || v > 30) {
        return apiError('会话时长须在 1~30 天之间', 400);
      }
    }
    if (body.max_login_attempts !== undefined) {
      const v = Number(body.max_login_attempts);
      if (!Number.isInteger(v) || v < 1 || v > 20) {
        return apiError('最大登录尝试次数须在 1~20 之间', 400);
      }
    }

    const upserts = allowedKeys
      .filter((key) => body[key] !== undefined)
      .map((key) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) },
        }),
      );

    await prisma.$transaction(upserts);

    const records = await prisma.systemSetting.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const record of records) {
      settings[record.key] = record.value;
    }

    const updatedKeys = allowedKeys.filter((key) => body[key] !== undefined);
    if (updatedKeys.length > 0) {
      await writeAuditLog({
        actorId: currentUser.id,
        actorUsername: currentUser.username,
        action: 'settings.update',
        targetType: 'settings',
        targetLabel: updatedKeys.join(', '),
        detail: Object.fromEntries(updatedKeys.map((k) => [k, settings[k]])),
      });
    }

    return apiSuccess(settings, '保存成功');
  } catch (error) {
    return handleApiError(error, '保存设置失败', 'PUT /api/settings error');
  }
}
