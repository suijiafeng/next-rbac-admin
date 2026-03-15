import type { Metadata } from 'next';
import './globals.css';
import AntdRegistry from '../components/antd-registry';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'Next Admin',
  description: 'Admin System',
};

/**
 * 阻塞式脚本：在 React hydration 之前同步设置 data-theme，避免首屏闪白/闪黑
 */
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('next-admin-theme');
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var mode = stored || 'light';
    var resolved = mode === 'system' ? sys : mode;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AntdRegistry>
          <AuthProvider>{children}</AuthProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
