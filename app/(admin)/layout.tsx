import { redirect } from 'next/navigation';
import AdminLayout from '@/components/admin-layout';
import { getCurrentAdminUser } from '@/lib/admin-user';

interface AdminGroupLayoutProps {
  children: React.ReactNode;
}

export default async function AdminGroupLayout(props: AdminGroupLayoutProps) {
  const { children } = props;

  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <AdminLayout currentUser={currentUser}>
      {children}
    </AdminLayout>
  );
}