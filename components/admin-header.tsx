'use client';

import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Dropdown,
  Layout,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  BellOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  SearchOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import type { MenuProps } from 'antd';
import { useTheme } from './providers/ThemeProvider';
import { PAGE_META } from '@/lib/page-meta';

const { Text } = Typography;
const { Header } = Layout;

// ─── 角色标签 ─────────────────────────────────────────────
const ROLE_LABEL: Record<string, { text: string; color: string }> = {
  SUPER_ADMIN: { text: '超级管理员', color: 'magenta' },
  ADMIN: { text: '管理员', color: 'blue' },
  USER: { text: '普通用户', color: 'default' },
};

// ─── 头像配色 ─────────────────────────────────────────────
const AVATAR_COLORS = [
  '#1677ff', '#52c41a', '#faad14', '#f5222d',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
];
function avatarColor(username: string) {
  if (!username) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface CurrentUser {
  nickname: string | null;
  username: string;
  role: string;
}

interface AdminHeaderProps {
  currentUser: CurrentUser;
  onOpenProfile: () => void;
  /** 仅在移动端显示的汉堡按钮回调 */
  onMobileMenuClick?: () => void;
  showMobileMenu?: boolean;
}

export default function AdminHeader(props: AdminHeaderProps) {
  const { currentUser, onOpenProfile, onMobileMenuClick, showMobileMenu } = props;
  const router = useRouter();
  const pathname = usePathname();
  const { resolved, toggle } = useTheme();

  useEffect(() => {
    router.prefetch('/profile');
  }, [router]);

  // 计算面包屑
  const breadcrumbItems = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const items = [
      {
        href: '/dashboard',
        title: (
          <span>
            <HomeOutlined style={{ marginRight: 4 }} />
            首页
          </span>
        ),
      },
    ];
    segments.forEach((seg, idx) => {
      const isLast = idx === segments.length - 1;
      const label = PAGE_META[seg]?.label ?? seg;
      items.push(
        isLast
          ? { title: <span>{label}</span>, href: '' }
          : { title: <span>{label}</span>, href: '/' + segments.slice(0, idx + 1).join('/') },
      );
    });
    return items;
  }, [pathname]);

  const displayName = currentUser.nickname || currentUser.username || '?';
  const firstChar = displayName[0]?.toUpperCase() || '?';
  const bgColor = avatarColor(currentUser.username || displayName);
  const roleTag = ROLE_LABEL[currentUser.role] ?? { text: currentUser.role, color: 'default' };

  const userMenu: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0', minWidth: 180 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
            {displayName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            @{currentUser.username}
          </div>
          <div style={{ marginTop: 6 }}>
            <Tag color={roleTag.color} style={{ marginRight: 0, fontSize: 11 }}>
              {roleTag.text}
            </Tag>
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'profile', label: '个人中心', icon: <UserOutlined /> },
    { type: 'divider' },
    {
      key: 'logout',
      label: <span style={{ color: 'var(--color-danger)' }}>退出登录</span>,
      icon: <LogoutOutlined style={{ color: 'var(--color-danger)' }} />,
    },
  ];

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 16px',
        height: 52,
        lineHeight: '52px',
        background: 'var(--bg-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        gap: 16,
      }}
    >
      {/* 左侧：移动端汉堡 + 面包屑 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {showMobileMenu && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMobileMenuClick}
            style={{ width: 32, height: 32 }}
          />
        )}
        <Breadcrumb
          items={breadcrumbItems.map((it) => ({
            title: it.href ? <a href={it.href}>{it.title}</a> : it.title,
          }))}
          style={{ fontSize: 13 }}
        />
      </div>

      {/* 右侧：搜索 + 主题 + 消息 + 用户 */}
      <Space size={4} align="center">
        <Tooltip title="全局搜索 (⌘K)" placement="bottom">
          <Button
            type="text"
            icon={<SearchOutlined />}
            style={{ width: 32, height: 32 }}
          />
        </Tooltip>

        <Tooltip title={resolved === 'dark' ? '切换为亮色' : '切换为暗色'} placement="bottom">
          <Button
            type="text"
            icon={resolved === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggle}
            style={{ width: 32, height: 32 }}
          />
        </Tooltip>

        <Tooltip title="消息" placement="bottom">
          <Badge dot offset={[-6, 6]}>
            <Button type="text" icon={<BellOutlined />} style={{ width: 32, height: 32 }} />
          </Badge>
        </Tooltip>

        <div
          style={{
            width: 1,
            height: 20,
            background: 'var(--border-subtle)',
            margin: '0 8px',
          }}
        />

        <Dropdown
          menu={{
            items: userMenu,
            onClick: async ({ key }) => {
              if (key === 'logout') {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }
              if (key === 'profile') onOpenProfile();
            },
          }}
          placement="bottomRight"
          arrow
        >
          <div
            style={{
              cursor: 'pointer',
              padding: '0 8px',
              height: 36,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Avatar
              size={28}
              style={{ backgroundColor: bgColor, fontWeight: 600, fontSize: 13, flexShrink: 0 }}
            >
              {firstChar}
            </Avatar>
            <Text
              style={{ fontSize: 13, maxWidth: 100, color: 'var(--text-primary)' }}
              ellipsis
            >
              {displayName}
            </Text>
          </div>
        </Dropdown>
      </Space>
    </Header>
  );
}
