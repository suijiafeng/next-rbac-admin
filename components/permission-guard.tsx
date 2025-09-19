import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentAdminUser } from '@/lib/admin-user';
import Page403 from '@/components/403/page'

interface PermissionGuardProps {
  allowRoles: string[];
  children: ReactNode;
}

export default async function PermissionGuard(
  props: PermissionGuardProps,
) {
  const { allowRoles, children } = props;

  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (!allowRoles.includes(currentUser.role)) {
    return <Page403 />
  }

  return <>{children}</>;
}