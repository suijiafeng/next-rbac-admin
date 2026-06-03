'use client';

import SettingsContent from '@/components/settings-content';
import PermissionGuard from '@/components/permission-guard';
import { Role } from '@/constants/permission'
import NoPermission from '@/components/403/page'
export default function SettingsPage() {
  return (
    <PermissionGuard allowedRoles={[Role.SUPER_ADMIN]} fallback={<NoPermission />}>
      <SettingsContent />
    </PermissionGuard>

  );
}
