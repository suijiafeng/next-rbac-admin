import AdminLayout from '@/components/admin-layout';

interface AdminGroupLayoutProps {
  children: React.ReactNode;
}

export default function AdminGroupLayout(props: AdminGroupLayoutProps) {
  const { children } = props;

  return <AdminLayout>{children}</AdminLayout>;
}