import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // 检查系统是否开放注册
    const allowRegisterSetting = await prisma.systemSetting.findUnique({
      where: { key: 'allow_register' },
    });
    const allowRegister = allowRegisterSetting?.value === 'true';

    if (!allowRegister) {
      return NextResponse.json(
        { code: 1, data: null, message: '当前系统未开放注册，请联系管理员' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { username, nickname, password, confirmPassword, email } = body;

    if (!username || !nickname || !password) {
      return NextResponse.json(
        { code: 1, data: null, message: '用户名、昵称和密码不能为空' },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { code: 1, data: null, message: '两次输入的密码不一致' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { code: 1, data: null, message: '密码长度不能少于 6 位' },
        { status: 400 },
      );
    }

    const existedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existedUser) {
      return NextResponse.json(
        { code: 1, data: null, message: '用户名或邮箱已存在' },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!userRole) {
      return NextResponse.json(
        { code: 1, data: null, message: '默认用户角色不存在' },
        { status: 500 },
      );
    }

    // 新注册用户默认 status: 0，等待管理员审核后启用
    const user = await prisma.user.create({
      data: {
        username,
        nickname,
        email: email || null,
        password: hashedPassword,
        status: 0,
        userRoles: {
          create: {
            roleId: userRole.id,
          },
        },
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
      },
    });

    return NextResponse.json({
      code: 0,
      data: user,
      message: '注册成功，请等待管理员审核',
    });
  } catch (error) {
    console.error('POST /api/auth/register error:', error);

    return NextResponse.json(
      { code: 1, data: null, message: '注册失败，请稍后重试' },
      { status: 500 },
    );
  }
}
