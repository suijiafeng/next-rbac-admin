import UsersContent from '@/components/users-content';
import PermissionGuard from '@/components/permission-guard';
import { Role } from '@/constants/permission'
import NoPermission from '@/components/403/page'
export default function UsersPage() {
  return (
    <PermissionGuard allowedRoles={[Role.SUPER_ADMIN, Role.ADMIN]} fallback={<NoPermission />}>
      <UsersContent />
    </PermissionGuard>
  );
}
