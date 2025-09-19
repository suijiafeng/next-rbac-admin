'use client';

import { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AntdRegistry as NextAntdRegistry } from '@ant-design/nextjs-registry';

interface AntdRegistryProps {
  children: ReactNode;
}

export default function AntdRegistry(props: AntdRegistryProps) {
  const { children } = props;

  return (
    <NextAntdRegistry>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </NextAntdRegistry>
  );
}
