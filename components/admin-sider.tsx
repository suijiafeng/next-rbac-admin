'use client';

import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

const { Sider } = Layout;

interface AdminSiderProps {
  collapsed: boolean;
}

export default function AdminSider(props: AdminSiderProps) {
  const { collapsed } = props;
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/users');
    router.prefetch('/settings');
    router.prefetch('/profile');
  }, [router]);

  const selectedKeys = useMemo(() => {
    if (pathname.startsWith('/dashboard')) {
      return ['/dashboard'];
    }

    if (pathname.startsWith('/users')) {
      return ['/users'];
    }

    if (pathname.startsWith('/settings')) {
      return ['/settings'];
    }

    return ['/dashboard'];
  }, [pathname]);

  return (
    <Sider trigger={null} collapsible collapsed={collapsed}>
      <div
        style={{
          height: 56,
          margin: 16,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          fontSize: 18,
          fontWeight: 600,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {collapsed ? 'NA' : 'Next Admin'}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        items={[
          {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: <Link href="/dashboard">仪表盘</Link>,
          },
          {
            key: '/users',
            icon: <UserOutlined />,
            label: <Link href="/users">用户管理</Link>,
          },
          {
            key: '/settings',
            icon: <SettingOutlined />,
            label: <Link href="/settings">系统设置</Link>,
          },
        ]}
      />
    </Sider>
  );
}
