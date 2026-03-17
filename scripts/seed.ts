import { config as loadEnv } from 'dotenv';
// tsx 不会自动加载 .env.local，这里显式加载，确保 DATABASE_URL 可用
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS } from '../constants/permission';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化 RBAC 数据...');

  /**
   * 1. 创建角色
   */
  const roles = [
    { name: 'SUPER_ADMIN', description: '超级管理员 - 拥有所有权限' },
    { name: 'ADMIN', description: '管理员 - 拥有大部分管理权限' },
    { name: 'USER', description: '普通用户 - 基本查看权限' },
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
    // 用户模块权限
    { code: PERMISSIONS.USER_VIEW, name: '查看用户', description: '可以查看用户列表和详情' },
    { code: PERMISSIONS.USER_CREATE, name: '创建用户', description: '可以创建新用户' },
    { code: PERMISSIONS.USER_EDIT, name: '编辑用户', description: '可以编辑用户信息' },
    { code: PERMISSIONS.USER_DELETE, name: '删除用户', description: '可以删除用户' },

    // 设置模块权限
    { code: PERMISSIONS.SETTINGS_VIEW, name: '查看设置', description: '可以查看系统设置' },
    { code: PERMISSIONS.SETTINGS_EDIT, name: '编辑设置', description: '可以修改系统设置' },

    // 角色模块权限
    { code: PERMISSIONS.ROLE_VIEW, name: '查看角色', description: '可以查看角色列表和详情' },
    { code: PERMISSIONS.ROLE_CREATE, name: '创建角色', description: '可以创建新角色' },
    { code: PERMISSIONS.ROLE_EDIT, name: '编辑角色', description: '可以编辑角色信息和权限' },
    { code: PERMISSIONS.ROLE_DELETE, name: '删除角色', description: '可以删除角色' },
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
    where: { name: 'SUPER_ADMIN' },
  });

  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  const userRole = await prisma.role.findUnique({
    where: { name: 'USER' },
  });

  // 查询所有权限
  const allPermissions = await prisma.permission.findMany();

  // SUPER_ADMIN 拥有全部权限
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

  console.log('✅ SUPER_ADMIN 权限绑定完成');

  // ADMIN 拥有除删除权限外的所有权限
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

  console.log('✅ ADMIN 权限绑定完成');

  // USER 只有查看权限
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

  console.log('✅ USER 权限绑定完成');

  /**
   * 4. 创建默认用户
   */

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 创建超级管理员用户
  const superAdminUser = await prisma.user.upsert({
    where: { username: 'super_admin' },
    update: {},
    create: {
      username: 'super_admin',
      password: hashedPassword,
      nickname: '超级管理员',
      email: 'super_admin@example.com',
      status: 1,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: superAdminRole!.id,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole!.id,
    },
  });

  // 创建管理员用户
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      nickname: '管理员',
      email: 'admin@example.com',
      status: 1,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole!.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole!.id,
    },
  });

  // 创建普通用户
  const normalUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      password: hashedPassword,
      nickname: '普通用户',
      email: 'user@example.com',
      status: 1,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: normalUser.id,
        roleId: userRole!.id,
      },
    },
    update: {},
    create: {
      userId: normalUser.id,
      roleId: userRole!.id,
    },
  });

  /**
   * 4.1 创建更多测试用户数据
   */
  const testUsers = [
    // 管理员用户
    { username: 'manager1', nickname: '张经理', email: 'manager1@company.com', role: 'ADMIN', status: 1 },
    { username: 'manager2', nickname: '李主管', email: 'manager2@company.com', role: 'ADMIN', status: 1 },
    { username: 'manager3', nickname: '王总监', email: 'manager3@company.com', role: 'ADMIN', status: 0 }, // 禁用状态

    // 普通用户
    { username: 'developer1', nickname: '赵开发', email: 'dev1@company.com', role: 'USER', status: 1 },
    { username: 'developer2', nickname: '钱前端', email: 'dev2@company.com', role: 'USER', status: 1 },
    { username: 'developer3', nickname: '孙后端', email: 'dev3@company.com', role: 'USER', status: 1 },
    { username: 'developer4', nickname: '周测试', email: 'dev4@company.com', role: 'USER', status: 1 },
    { username: 'developer5', nickname: '吴运维', email: 'dev5@company.com', role: 'USER', status: 0 }, // 禁用状态

    { username: 'designer1', nickname: '郑设计师', email: 'design1@company.com', role: 'USER', status: 1 },
    { username: 'designer2', nickname: '王UI', email: 'design2@company.com', role: 'USER', status: 1 },

    { username: 'analyst1', nickname: '冯分析师', email: 'analyst1@company.com', role: 'USER', status: 1 },
    { username: 'analyst2', nickname: '陈数据', email: 'analyst2@company.com', role: 'USER', status: 1 },

    { username: 'hr1', nickname: '褚人事', email: 'hr1@company.com', role: 'USER', status: 1 },
    { username: 'hr2', nickname: '卫招聘', email: 'hr2@company.com', role: 'USER', status: 1 },

    { username: 'sales1', nickname: '蒋销售', email: 'sales1@company.com', role: 'USER', status: 1 },
    { username: 'sales2', nickname: '沈业务', email: 'sales2@company.com', role: 'USER', status: 1 },
    { username: 'sales3', nickname: '韩客户', email: 'sales3@company.com', role: 'USER', status: 0 }, // 禁用状态

    { username: 'support1', nickname: '杨客服', email: 'support1@company.com', role: 'USER', status: 1 },
    { username: 'support2', nickname: '朱技术支持', email: 'support2@company.com', role: 'USER', status: 1 },
  ];

  for (const userData of testUsers) {
    const testUser = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        username: userData.username,
        password: hashedPassword,
        nickname: userData.nickname,
        email: userData.email,
        status: userData.status,
      },
    });

    const roleToAssign = userData.role === 'ADMIN' ? adminRole : userRole;
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: testUser.id,
          roleId: roleToAssign!.id,
        },
      },
      update: {},
      create: {
        userId: testUser.id,
        roleId: roleToAssign!.id,
      },
    });
  }

  console.log('✅ 测试用户数据创建完成 (18个用户)');

  /**
   * 5. 创建系统设置
   */
  const systemSettings = [
    { key: 'site_name', value: 'Next Admin Demo' },
    { key: 'site_description', value: '基于 Next.js 的管理后台演示' },
    { key: 'admin_email', value: 'admin@example.com' },
    { key: 'allow_registration', value: 'true' },
    { key: 'default_user_status', value: '1' },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ 系统设置初始化完成');

  /**
   * 6. 创建示例反馈数据（仅当当前没有任何反馈时）
   *    数据自底向上流动：USER 的反馈 ADMIN + SUPER_ADMIN 可见；ADMIN 的反馈仅 SUPER_ADMIN 可见
   */
  const feedbackCount = await prisma.feedback.count();
  if (feedbackCount === 0) {
    await prisma.feedback.createMany({
      data: [
        {
          submitterId: normalUser.id,
          submitterUsername: 'user',
          submitterNickname: '普通用户',
          submitterRole: 'USER',
          type: 'feature',
          priority: 'medium',
          title: '希望用户表格支持列宽拖拽',
          content: '在用户管理页面，列比较多的时候希望能手动拖拽调整列宽，方便查看完整内容。',
          contact: 'user@example.com',
          satisfaction: 4,
        },
        {
          submitterId: normalUser.id,
          submitterUsername: 'user',
          submitterNickname: '普通用户',
          submitterRole: 'USER',
          type: 'bug',
          priority: 'high',
          title: '深色模式下部分文字看不清',
          content: '切换到深色主题后，个人中心页面的次要说明文字颜色太浅，几乎看不见，麻烦调一下对比度。',
          satisfaction: 3,
        },
        {
          submitterId: adminUser.id,
          submitterUsername: 'admin',
          submitterNickname: '管理员',
          submitterRole: 'ADMIN',
          type: 'feature',
          priority: 'low',
          title: '建议增加批量导出用户为 Excel',
          content: '管理用户时经常需要把筛选结果导出给其他部门，希望能一键导出当前筛选条件下的用户列表。',
          contact: 'admin@example.com',
          satisfaction: 5,
        },
      ],
    });
    console.log('✅ 示例反馈数据创建完成 (3 条)');
  }

  console.log('🎉 RBAC 初始化完成！');
  console.log('');
  console.log('📋 默认用户账户:');
  console.log('   超级管理员: super_admin / 123456');
  console.log('   管理员: admin / 123456');
  console.log('   普通用户: user / 123456');
  console.log('');
  console.log('� 已创建 21 个测试用户 (包括3个默认用户 + 18个测试用户)');
  console.log('   - 管理员用户: 4个 (包括默认admin)');
  console.log('   - 普通用户: 17个 (包括默认user)');
  console.log('   - 禁用用户: 3个 (用于测试状态筛选)');
  console.log('');
  console.log('🔗 访问地址: http://localhost:3000');
  console.log('💡 建议: 使用 admin 或 super_admin 账户登录测试用户管理功能');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });