'use client';

import { Drawer, Layout, Grid } from 'antd';
import { useEffect, useState } from 'react';
import AdminHeader from './admin-header';
import AdminSider from './admin-sider';
import ProfileModal from './profile-modal';
import PageTabs from './page-tabs';
import { TabsProvider } from './providers/TabsProvider';

const { Content } = Layout;
const { useBreakpoint } = Grid;

interface CurrentUser {
  id: number;
  username: string;
  nickname: string | null;
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

const COLLAPSE_KEY = 'next-admin-sider-collapsed';

export default function AdminLayout(props: AdminLayoutProps) {
  const { children, currentUser } = props;
  const screens = useBreakpoint();
  const isMobile = !screens.lg; // <992px 视为移动端

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // 恢复折叠状态
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored != null) setCollapsed(stored === '1');
  }, []);

  // 持久化
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const siderWidth = collapsed ? 64 : 220;

  const handleToggle = () => {
    if (isMobile) setMobileOpen((v) => !v);
    else setCollapsed((v) => !v);
  };

  return (
    <TabsProvider>
    <Layout
      hasSider
      style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg-layout)' }}
    >
      {/* 桌面端固定侧栏 */}
      {!isMobile && (
        <AdminSider
          collapsed={collapsed}
          role={currentUser.role}
          onToggleCollapse={handleToggle}
        />
      )}

      {/* 移动端 Drawer 侧栏 */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          width={220}
          closable={false}
          styles={{
            body: { padding: 0, background: 'var(--sider-bg)' },
            header: { display: 'none' },
          }}
        >
          <div style={{ position: 'relative', height: '100%' }}>
            <AdminSider
              collapsed={false}
              role={currentUser.role}
              onToggleCollapse={() => setMobileOpen(false)}
            />
          </div>
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : siderWidth,
          transition: 'margin-left 0.2s',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg-layout)',
        }}
      >
        <AdminHeader
          currentUser={currentUser}
          onOpenProfile={() => setProfileOpen(true)}
          showMobileMenu={isMobile}
          onMobileMenuClick={() => setMobileOpen(true)}
        />

        {/* 多标签页 —— 紧贴 Header 下方 */}
        <PageTabs />

        <Content
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            background: 'var(--bg-layout)',
          }}
        >
          {/*
            height:100% + flex column —— 让子页面可以用 h-full / flex-1 占满高度，
            同时 max-width 居中。子页面如果内容超出，由 Content (overflowY:auto) 接管滚动。
          */}
          <div
            style={{
              maxWidth: 1600,
              marginInline: 'auto',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Layout>
    </TabsProvider>
  );
}
