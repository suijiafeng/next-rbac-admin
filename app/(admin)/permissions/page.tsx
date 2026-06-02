'use client';

import { Spin } from 'antd';
import PermissionsContent from '@/components/permissions-content';
import NoPermission from '@/components/403/page';
import { PERMISSIONS } from '@/constants/permission';
import { useAuthContext } from '@/components/providers/AuthProvider';

/**
 * 权限管理页（CSR）
 * —— 客户端用 AuthProvider 判断是否具备查看权限；
 *    真正的数据访问拦截仍由 /api/* 的 requirePermission 在服务端保证。
 */
export default function PermissionsPage() {
  const { loading, hasPermission } = useAuthContext();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!hasPermission(PERMISSIONS.ROLE_VIEW)) {
    return <NoPermission />;
  }

  return <PermissionsContent />;
}
