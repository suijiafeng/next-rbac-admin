import ProfleContent from '@/components/profile-content';
import PermissionGuard from '@/components/permission-guard';
import { Role } from '@/constants/permission'
export default function SettingsPage() {
    return (
        <PermissionGuard allowRoles={[Role.SUPER_ADMIN, Role.ADMIN, Role.USER]}>
            <ProfleContent />
        </PermissionGuard>

    );
}
