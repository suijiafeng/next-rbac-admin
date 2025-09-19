'use client';

import { Button, Dropdown, Layout, Space, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
const { Text } = Typography
const { Header } = Layout;

interface AdminHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AdminHeader(props: AdminHeaderProps) {
  const { collapsed, onToggleCollapse } = props;

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人信息',
      icon: <UserOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
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
              await fetch('/api/auth/logout', {
                method: 'POST',
              });
              window.location.href = '/login';
            }
          },
        }}
      >
        <Button type="text">管理员</Button>
      </Dropdown>
    </Header>
  );
}