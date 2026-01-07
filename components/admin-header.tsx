'use client';

import { Avatar, Button, Dropdown, Layout, Space, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { MenuProps } from 'antd';

const { Text } = Typography;
const { Header } = Layout;

interface CurrentUser {
  nickname: string | null;
  username: string;
  role: string;
}

interface AdminHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: CurrentUser;
  onOpenProfile: () => void;
}

// 根据用户名生成固定颜色
const AVATAR_COLORS = [
  '#1677ff', '#52c41a', '#faad14', '#f5222d',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
];
function avatarColor(username: string) {
  if (!username) {
    return AVATAR_COLORS[0];
  }

  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function AdminHeader(props: AdminHeaderProps) {
  const { collapsed, onToggleCollapse, currentUser, onOpenProfile } = props;
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/profile');
  }, [router]);

  const displayName = currentUser.username || currentUser.nickname || '?';
  const firstChar = displayName[0]?.toUpperCase() || '?';
  const bgColor = avatarColor(currentUser.username || displayName);

  const items: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
    },
    {
      key: 'profile',
      label: '个人中心',
      icon: <UserOutlined />,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: <span style={{ color: '#ff4d4f' }}>退出</span>,
      icon: <LogoutOutlined style={{ color: '#ff4d4f' }} />,
    },
  ];

  return (
    <Header
      style={{
        padding: '0 16px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Space>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggleCollapse}
        />
        <Text strong>后台管理系统</Text>
      </Space>

      <Dropdown
        menu={{
          items,
          onClick: async ({ key }) => {
            if (key === 'logout') {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }
            if (key === 'profile') {
              onOpenProfile();
            }
          },
        }}
        placement="bottomRight"
        arrow
      >
        <div
          style={{ cursor: 'pointer', padding: '0 4px', borderRadius: 6 }}
          className="hover:bg-slate-50 gap-x-2  flex items-center"
        >
          <Avatar
            size={32}
            style={{ backgroundColor: bgColor, fontWeight: 600, fontSize: 14, flexShrink: 0 }}
          >
            {firstChar}
          </Avatar>
          <Text style={{ fontSize: 14, maxWidth: 100 }} ellipsis>
            {currentUser.username}
          </Text>
        </div>
      </Dropdown>
    </Header>
  );
}
