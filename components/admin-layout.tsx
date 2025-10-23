'use client';

import { Layout } from 'antd';
import { useState } from 'react';
import AdminHeader from './admin-header';
import AdminSider from './admin-sider';

const { Content } = Layout;

interface CurrentUser {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  currentUser: CurrentUser;
}

export default function AdminLayout(props: AdminLayoutProps) {
  const { children, currentUser } = props;
  const [collapsed, setCollapsed] = useState(false);

  const siderWidth = collapsed ? 80 : 200;

  return (
    <Layout hasSider style={{ height: '100vh', overflow: 'hidden' }}>
      {/* 固定左侧菜单 */}
      <AdminSider collapsed={collapsed} role={currentUser.role} />

      {/* 右侧：header 固定 + 内容区可滚动 */}
      <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AdminHeader
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          currentUser={currentUser}
        />

        <Content
          style={{
            flex: 1,
            overflowY: 'auto',
            margin: 16,
            padding: 16,
            background: '#f5f6f8',
            borderRadius: 8,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}