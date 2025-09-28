import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getCurrentAdminUser() {
  const session = await getAdminSession();

  if (!session?.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      username: true,
      nickname: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || user.status !== 1) {
    return null;
  }

  return user;
}
