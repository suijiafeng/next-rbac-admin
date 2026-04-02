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

  return (
    <Layout hasSider style={{ minHeight: '100vh' }}>
      <AdminSider
        collapsed={collapsed}
        role={currentUser.role}
      />

      <Layout>
        <AdminHeader
          collapsed={collapsed}
          onToggleCollapse={() => {
            setCollapsed((prev) => !prev);
          }}
          currentUser={currentUser}
        />

        <Content
          style={{
            margin: 16,
            padding: 16,
            background: '#f5f6f8',
            borderRadius: 8,
            minHeight: 'calc(100vh - 96px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}