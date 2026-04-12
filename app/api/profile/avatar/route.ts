import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
  try {
    const currentUser = await requireAdminUser();

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return apiError('请使用 multipart/form-data 上传', 400);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return apiError('请上传文件', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('仅支持 JPG / PNG / WebP / GIF 格式', 400);
    }

    if (file.size > MAX_SIZE) {
      return apiError('文件大小不能超过 2 MB', 400);
    }

    const rawExt = file.type.split('/')[1] ?? 'jpg';
    const ext = rawExt.replace('jpeg', 'jpg');
    const filename = `${currentUser.id}.${ext}`;
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars');

    await mkdir(avatarsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(avatarsDir, filename), buffer);

    const avatarUrl = `/avatars/${filename}`;

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { avatar: avatarUrl },
    });

    return apiSuccess({ avatarUrl }, '头像更新成功');
  } catch (error) {
    return handleApiError(error, '上传头像失败', 'POST /api/profile/avatar error');
  }
}
