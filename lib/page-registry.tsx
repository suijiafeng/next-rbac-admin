'use client';

import React from 'react';
import DashboardContent from '@/components/dashboard-content';
import UsersContent from '@/components/users-content';
import PermissionsContent from '@/components/permissions-content';
import SettingsContent from '@/components/settings-content';
import ProfileContent from '@/components/profile-content';
import FeedbackContent from '@/components/feedback-content';
import NotificationsContent from '@/components/notifications-content';
import ApprovalsContent from '@/components/approvals-content';
import TempGrantsContent from '@/components/temp-grants-content';
import ExamPapersContent from '@/components/exam/papers-content';
import ExamTakeContent from '@/components/exam/take-content';
import ExamResultContent from '@/components/exam/result-content';
import ExamPointsContent from '@/components/exam/points-content';
import ExamStatsContent from '@/components/exam/stats-content';
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
  '/users': {
    Component: UsersContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN], fallback: <NoPermission /> },
  },
  '/permissions': {
    Component: PermissionsContent,
    guard: { permissions: [PERMISSIONS.ROLE_VIEW], fallback: <NoPermission /> },
  },
  '/approvals': {
    Component: ApprovalsContent,
    guard: { permissions: [PERMISSIONS.CHANGE_VIEW], fallback: <NoPermission /> },
  },
  '/temp-grants': {
    Component: TempGrantsContent,
    guard: { permissions: [PERMISSIONS.TEMP_VIEW], fallback: <NoPermission /> },
  },
  '/audit': {
    Component: NotificationsContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN], fallback: <NoPermission /> },
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
  '/exams': {
    Component: ExamPapersContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN, Role.USER], fallback: <NoPermission /> },
  },
  '/exam-take': {
    Component: ExamTakeContent,
    guard: { permissions: [PERMISSIONS.EXAM_TAKE], fallback: <NoPermission /> },
  },
  '/exam-result': {
    Component: ExamResultContent,
    guard: { permissions: [PERMISSIONS.EXAM_TAKE], fallback: <NoPermission /> },
  },
  '/exam-points': {
    Component: ExamPointsContent,
    guard: { allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN, Role.USER], fallback: <NoPermission /> },
  },
  '/exam-stats': {
    Component: ExamStatsContent,
    guard: { permissions: [PERMISSIONS.EXAM_STATS], fallback: <NoPermission /> },
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
