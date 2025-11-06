'use client';

import React from 'react';
import { Role, type PermissionValue } from '@/constants/permission';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { hasPermission } from '@/lib/permission-map';

interface PermissionGuardProps {
  allowedRoles?: Role[];
  permissions?: PermissionValue[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  allowedRoles,
  permissions,
  children,
  fallback = null,
}) => {
  const { user, role, loading } = useAuthContext();

  if (loading) {
    return null;
  }

  if (!user || !role) {
    return <>{fallback}</>;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role as Role)) {
    return <>{fallback}</>;
  }

  if (
    permissions &&
    permissions.length > 0 &&
    !permissions.some((permission) => hasPermission(role as Role, permission))
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
