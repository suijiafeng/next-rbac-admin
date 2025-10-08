'use client';

import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

const { Sider } = Layout;

type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

interface AdminSiderProps {
  collapsed: boolean;
  role: Role;
}

interface MenuItemConfig {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles: Role[];
}

const menuConfig: MenuItemConfig[] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
    roles: ['USER', 'ADMIN', 'SUPER_ADMIN'],
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: '用户管理',
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    roles: ['SUPER_ADMIN'],
  },
  {
    key: '/profile',
    icon: <ProfileOutlined />,
    label: '个人信息',
    roles: ['USER', 'ADMIN', 'SUPER_ADMIN'],
  },
];

export default function AdminSider(props: AdminSiderProps) {
  const { collapsed, role } = props;
  const pathname = usePathname();
  const router = useRouter();

  const visibleMenus = useMemo(() => {
    return menuConfig.filter((item) => item.roles.includes(role));
  }, [role]);

  useEffect(() => {
    visibleMenus.forEach((item) => {
      router.prefetch(item.key);
    });
  }, [router, visibleMenus]);

  const selectedKeys = useMemo(() => {
    const matchedMenu = visibleMenus
      .filter((item) => pathname.startsWith(item.key))
      .sort((a, b) => b.key.length - a.key.length)[0];
      
    return matchedMenu ? [matchedMenu.key] : [];
  }, [pathname, visibleMenus]);

  const menuItems = useMemo(() => {
    return visibleMenus.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: <Link href={item.key}>{item.label}</Link>,
    }));
  }, [visibleMenus]);

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
        items={menuItems}
      />
    </Sider>
  );
}