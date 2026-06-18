'use client';

import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  SettingOutlined,
  MessageOutlined,
  AuditOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

const { Sider } = Layout;

type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

interface AdminSiderProps {
  collapsed: boolean;
  role: Role;
  /** 保留以兼容调用方；折叠控制现由 Header 统一负责 */
  onToggleCollapse?: () => void;
}

interface MenuItemConfig {
  key: string;
  icon: React.ReactNode;
  label: string;
  group: string;
  roles: Role[];
}

const menuConfig: MenuItemConfig[] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
    group: '工作台',
    roles: ['USER', 'ADMIN', 'SUPER_ADMIN'],
  },
  {
    key: '/monitoring',
    icon: <LineChartOutlined />,
    label: '数据监控',
    group: '工作台',
    roles: ['USER', 'ADMIN', 'SUPER_ADMIN'],
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: '用户管理',
    group: '系统管理',
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    key: '/permissions',
    icon: <SafetyCertificateOutlined />,
    label: '权限管理',
    group: '系统管理',
    roles: ['SUPER_ADMIN'],
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    group: '系统管理',
    roles: ['SUPER_ADMIN'],
  },
  {
    key: '/feedback',
    icon: <MessageOutlined />,
    label: '意见反馈',
    group: '其他',
    roles: ['USER', 'ADMIN'],
  },
  {
    key: '/announcements',
    icon: <NotificationOutlined />,
    label: '公告管理',
    group: '系统管理',
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    key: '/notifications',
    icon: <AuditOutlined />,
    label: '审计日志',
    group: '系统管理',
    roles: ['SUPER_ADMIN'],
  },
];

export default function AdminSider(props: AdminSiderProps) {
  const { collapsed, role } = props;
  const pathname = usePathname();
  const router = useRouter();

  const visibleMenus = useMemo(
    () => menuConfig.filter((item) => item.roles.includes(role)),
    [role],
  );

  useEffect(() => {
    visibleMenus.forEach((item) => router.prefetch(item.key));
  }, [router, visibleMenus]);

  const selectedKeys = useMemo(() => {
    const matched = visibleMenus
      .filter((item) => pathname.startsWith(item.key))
      .sort((a, b) => b.key.length - a.key.length)[0];
    return matched ? [matched.key] : [];
  }, [pathname, visibleMenus]);

  // 数据密集风：分组菜单（折叠时退化为平铺，避免拥挤）
  const menuItems = useMemo(() => {
    if (collapsed) {
      return visibleMenus.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: <Link href={item.key}>{item.label}</Link>,
      }));
    }

    const groups = new Map<string, MenuItemConfig[]>();
    visibleMenus.forEach((item) => {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    });

    return Array.from(groups.entries()).map(([group, items]) => ({
      key: `group-${group}`,
      type: 'group' as const,
      label: (
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase' as const,
          }}
        >
          {group}
        </span>
      ),
      children: items.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: <Link href={item.key}>{item.label}</Link>,
      })),
    }));
  }, [collapsed, visibleMenus]);

  return (
    <Sider
      className="admin-sider"
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={220}
      collapsedWidth={64}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        height: '100vh',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Logo 区（展开态：Logo 在左，折叠按钮在右；折叠态：Logo 居中） */}
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? 0 : '0 12px 0 16px',
          borderBottom: '1px solid var(--sider-divider)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            N
          </div>
          {!collapsed && (
            <span
              style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 15,
                marginLeft: 10,
                letterSpacing: 0.3,
                whiteSpace: 'nowrap',
              }}
            >
              RBAC Admin
            </span>
          )}
        </div>

      </div>

      {/* 菜单区（可滚动） */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 8 }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          style={{ border: 'none', background: 'transparent' }}
        />
      </div>
    </Sider>
  );
}
