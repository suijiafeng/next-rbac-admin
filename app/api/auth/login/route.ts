import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                {
                    code: 1,
                    data: null,
                    message: '用户名和密码不能为空',
                },
                {
                    status: 400,
                },
            );
        }

        const adminUser = await prisma.adminUser.findFirst({
            where: {
                username,
                password,
                status: 1,
            },
        });

        if (!adminUser) {
            return NextResponse.json(
                {
                    code: 1,
                    data: null,
                    message: '用户名或密码错误',
                },
                {
                    status: 401,
                },
            );
        }

        const response = NextResponse.json({
            code: 0,
            data: {
                id: adminUser.id,
                username: adminUser.username,
                nickname: adminUser.nickname,
            },
            message: '登录成功',
        });

        response.cookies.set('admin_token', String(adminUser.id), {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        console.error('POST /api/auth/login error:', error);

        return NextResponse.json(
            {
                code: 1,
                data: null,
                message: '登录失败',
            },
            {
                status: 500,
            },
        );
    }
}