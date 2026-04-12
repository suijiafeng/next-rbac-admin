import { resolveRoleFromNames } from '@/lib/user-role';

export const userSelect = {
  id: true,
  username: true,
  nickname: true,
  email: true,
  avatar: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

export type UserWithRoles = {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  avatar: string | null;
  status: number;
  createdAt: Date;
  updatedAt: Date;
  userRoles: Array<{ role: { name: string } }>;
};

export function formatUser(user: UserWithRoles) {
  const { userRoles, ...rest } = user;

  return {
    ...rest,
    nickname: rest.nickname ?? '',
    avatar: rest.avatar ?? null,
    role: resolveRoleFromNames(userRoles.map((item) => item.role.name)),
  };
}

/** 生成随机初始密码（12位，含大小写字母和数字，剔除易混淆字符） */
export function generateInitialPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (byte) => chars[byte % chars.length]).join('');
}
