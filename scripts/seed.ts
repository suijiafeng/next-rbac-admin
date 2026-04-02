import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
  console.log('🌱 开始初始化数据...');

  const count = await prisma.user.count();
  await prisma.user.createMany({
    data: Array(97)
      .fill(null)
      .map((_v, i) => ({
        username: `user_${i}_${count}`,
        nickname: 'nickname' + count,
        email: `user_${i}${count}@test.com`,
        role: 'USER',
        status: i % 2,
      })),
  });

  const adminPassword = await bcrypt.hash('123456', 10);

  await prisma.user.createMany({
    skipDuplicates: true,
    data: [
      {
        username: 'super',
        password: adminPassword,
        nickname: '超级管理员',
        role: 'SUPER_ADMIN',
        status: 1,
      },
      {
        username: 'admin',
        password: adminPassword,
        nickname: '普通管理员',
        role: 'ADMIN',
        status: 1,
      },
      {
        username: 'viewer',
        password: adminPassword,
        nickname: '只读用户',
        role: 'USER',
        status: 1,
      },
    ],
  });
}

console.log('✅ 用户数据初始化完成，共 100 条');
main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
