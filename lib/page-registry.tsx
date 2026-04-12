'use client';

import React from 'react';
import DashboardContent from '@/components/dashboard-content';
import MonitoringContent from '@/components/monitoring-content';
import UsersContent from '@/components/users-content';
import PermissionsContent from '@/components/permissions-content';
import SettingsContent from '@/components/settings-content';
import ProfileContent from '@/components/profile-content';
import FeedbackContent from '@/components/feedback-content';
import NotificationsContent from '@/components/notifications-content';
import AnnouncementsContent from '@/components/announcements-content';
import PermissionGuard from '@/components/permission-guard';
import NoPermission from '@/components/403/page';
import { Role, PERMISSIONS, type PermissionValue } from '@/constants/permission';

interface GuardConfig {
  allowedRoles?: Role[];
  permissions?: PermissionValue[];
  fallback?: React.ReactNode;
}

interface PageEntry {
  Component: React.ComponentType;
  guard?: GuardConfig;
}

/**
 * tab key → 页面组件 + 权限要求
 * key 与 lib/page-meta.ts 的 PAGE_META key 对齐（带前导斜杠）
 */
export const PAGE_REGISTRY: Record<string, PageEntry> = {
  '/dashboard': { Component: DashboardContent },
  '/monitoring': { Component: MonitoringContent },
  '/users': {
    Component: UsersContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN], fallback: <NoPermission /> },
  },
  '/permissions': {
    Component: PermissionsContent,
    guard: { permissions: [PERMISSIONS.ROLE_VIEW], fallback: <NoPermission /> },
  },
  '/settings': {
    Component: SettingsContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN], fallback: <NoPermission /> },
  },
  '/profile': {
    Component: ProfileContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN, Role.USER] },
  },
  '/feedback': {
    Component: FeedbackContent,
    guard: { allowedRoles: [Role.ADMIN, Role.USER], fallback: <NoPermission /> },
  },
  '/notifications': {
    Component: NotificationsContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN], fallback: <NoPermission /> },
  },
  '/announcements': {
    Component: AnnouncementsContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN], fallback: <NoPermission /> },
  },
};

export function renderRegistryPage(key: string): React.ReactNode {
  const entry = PAGE_REGISTRY[key];
  if (!entry) return null;
  const { Component, guard } = entry;
  const node = <Component />;
  if (!guard) return node;
  return (
    <PermissionGuard
      allowedRoles={guard.allowedRoles}
      permissions={guard.permissions}
      fallback={guard.fallback}
    >
      {node}
    </PermissionGuard>
  );
}
