import PermissionsContent from '@/components/permissions-content';
import NoPermission from '@/components/403/page';
import { PERMISSIONS } from '@/constants/permission';
import { requirePermission } from '@/lib/permission';

export default async function PermissionsPage() {
  try {
    await requirePermission(PERMISSIONS.ROLE_VIEW);
    return <PermissionsContent />;
  } catch {
    return <NoPermission />;
  }
}
