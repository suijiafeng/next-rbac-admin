import type { Metadata } from 'next';
import './globals.css';
import AntdRegistry from '../components/antd-registry';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'Next Admin',
  description: 'Admin System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <AuthProvider>{children}</AuthProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}