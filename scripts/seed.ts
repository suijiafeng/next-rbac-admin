import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化 RBAC 数据...');

  /**
   * 1. 创建角色
   */
  const roles = [
    { name: 'super_admin', description: '超级管理员' },
    { name: 'admin', description: '管理员' },
    { name: 'user', description: '普通用户' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('✅ 角色初始化完成');

  /**
   * 2. 创建权限
   */
  const permissions = [
    // 用户模块
    { code: 'user.view', name: '查看用户' },
    { code: 'user.create', name: '创建用户' },
    { code: 'user.edit', name: '编辑用户' },
    { code: 'user.delete', name: '删除用户' },

    // 角色模块
    { code: 'role.view', name: '查看角色' },
    { code: 'role.create', name: '创建角色' },
    { code: 'role.edit', name: '编辑角色' },
    { code: 'role.delete', name: '删除角色' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }

  console.log('✅ 权限初始化完成');

  /**
   * 3. 绑定角色权限
   */

  // 查询角色
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super_admin' },
  });

  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  const userRole = await prisma.role.findUnique({
    where: { name: 'user' },
  });

  // 查询所有权限
  const allPermissions = await prisma.permission.findMany();

  // super_admin 拥有全部权限
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole!.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole!.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ super_admin 权限绑定完成');

  // admin 拥有部分权限（不含 delete）
  const adminPermissions = allPermissions.filter(
    (p) => !p.code.includes('delete'),
  );

  for (const permission of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole!.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole!.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ admin 权限绑定完成');

  // user 只有查看权限
  const userPermissions = allPermissions.filter((p) =>
    p.code.includes('view'),
  );

  for (const permission of userPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole!.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: userRole!.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ user 权限绑定完成');

  /**
   * 4. 创建超级管理员用户
   */

  const adminPassword = await bcrypt.hash('123456', 10);


  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword, // ⚠️ 后面要改成加密
      nickname: '超级管理员',
    },
  });

  // 绑定 super_admin 角色
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole!.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole!.id,
    },
  });

  console.log('✅ 超级管理员创建完成');

  console.log('🎉 RBAC 初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });