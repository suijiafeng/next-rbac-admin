'use client';

import { ReactNode } from 'react';
import { AntdRegistry as NextAntdRegistry } from '@ant-design/nextjs-registry';
import { ThemeProvider } from './providers/ThemeProvider';

interface AntdRegistryProps {
  children: ReactNode;
}

/**
 * AntdRegistry —— 包装 Ant Design 的 SSR 注册与主题 Provider
 * 主题、ConfigProvider、locale 统一由 ThemeProvider 内部处理
 */
export default function AntdRegistry(props: AntdRegistryProps) {
  const { children } = props;

  return (
    <NextAntdRegistry>
      <ThemeProvider>{children}</ThemeProvider>
    </NextAntdRegistry>
  );
}
