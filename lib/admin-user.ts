import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveRoleFromNames } from '@/lib/user-role';

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
      avatar: true,
      status: true,
      authVersion: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!user || user.status !== 1) {
    return null;
  }

  const role = resolveRoleFromNames(
    user.userRoles.map((ur: { role: { name: string } }) => ur.role.name),
  );
  const tokenAuthVersion = session.authVersion ?? 0;

  if (tokenAuthVersion !== user.authVersion) {
    return null;
  }

  const { userRoles, ...rest } = user;
  void userRoles;
  return { ...rest, role };
}
