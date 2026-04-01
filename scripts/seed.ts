import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
    console.log('🌱 开始初始化数据...');
    // 先清空数据（开发阶段用）
    // await prisma.user.deleteMany();

    const count = await prisma.user.count();
    await prisma.user.createMany({
        data: Array(100).fill(null).map((v, i) => ({
            username: `user_${i}_${count}`,
            nickname: 'nickname' + count,
            email: `user_${i}${count}@test.com`,
            status: i % 2, // 0 / 1
        }))
    })

    console.log('✅ 用户数据初始化完成，共 100 条');

    await prisma.adminUser.create({
        data: {
            username: 'admin',
            password: '123456',
            nickname: '系统管理员',
            email: 'admin@test.com',
            role: 'super_admin',
            status: 1,
        },
    });
}

main()
    .catch((e) => {
        console.error('❌ 初始化失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });