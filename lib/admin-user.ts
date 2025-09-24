import { prisma } from './prisma';
import { getAdminUserId } from './auth';

export async function getCurrentAdminUser() {
    const userId = await getAdminUserId();

    if (!userId) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            username: true,
            nickname: true,
            role: true,
            status: true,
        },
    });

    return user;
}