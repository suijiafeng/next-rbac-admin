import UsersContent from '@/components/users-content';
import PermissionGuard from '@/components/permission-guard';
import { Role } from '@/constants/permission'

export default function UsersPage() {
  return (
    <PermissionGuard allowRoles={[Role.SUPER_ADMIN, Role.ADMIN, Role.USER]}>
      <UsersContent />
    </PermissionGuard>
  );
}
