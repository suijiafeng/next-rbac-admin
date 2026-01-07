'use client';

import { useMemo } from 'react';
import type { PermissionValue } from '@/constants/permission';
import { useAuthContext } from '@/components/providers/AuthProvider';

export function usePermission() {
  const { permissions, hasPermission, loading, user, role } = useAuthContext();

  const permissionSet = useMemo(() => {
    return new Set(permissions);
  }, [permissions]);

  const hasAnyPermission = (permissionList: PermissionValue[]) => {
    return permissionList.some((permission) => permissionSet.has(permission));
  };

  const hasAllPermissions = (permissionList: PermissionValue[]) => {
    return permissionList.every((permission) => permissionSet.has(permission));
  };

  return {
    user,
    role,
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}