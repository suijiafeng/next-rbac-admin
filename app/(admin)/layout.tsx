'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import AdminLayout from '@/components/admin-layout';
import { useAuthContext } from '@/components/providers/AuthProvider';

interface AdminGroupLayoutProps {
  children: React.ReactNode;
}

/**
 * 后台分组布局（CSR）
 * —— 鉴权改由客户端 AuthProvider 负责：
 *    - loading 时显示全屏 Spin
 *    - 未登录（/api/profile 返回 401）时客户端跳转 /login
 *    - 已登录则渲染 AdminLayout
 *  注：middleware.ts 仍在服务端拦截无 session 的请求作为第一道防线。
 */
export default function AdminGroupLayout(props: AdminGroupLayoutProps) {
  const { children } = props;
  const router = useRouter();
  const { user, role, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-layout)',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const currentUser = {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email ?? null,
    role: (role ?? user.role) as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
  };

  return <AdminLayout currentUser={currentUser}>{children}</AdminLayout>;
}
