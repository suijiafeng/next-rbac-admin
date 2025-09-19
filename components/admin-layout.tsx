'use client';

import { Layout } from 'antd';
import { useState } from 'react';
import AdminHeader from './admin-header';
import AdminSider from './admin-sider';

const { Content } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout(props: AdminLayoutProps) {
  const { children } = props;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout hasSider style={{ minHeight: '100vh' }}>
      <AdminSider collapsed={collapsed} />

      <Layout>
        <AdminHeader
          collapsed={collapsed}
          onToggleCollapse={() => {
            setCollapsed((prev) => !prev);
          }}
        />

        <Content
          style={{
            margin: 16,
            padding: 16,
            background: '#fff',
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
