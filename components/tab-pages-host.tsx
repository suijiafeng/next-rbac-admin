'use client';

import React from 'react';
import { useTabs } from './providers/TabsProvider';
import { renderRegistryPage } from '@/lib/page-registry';

/**
 * 多标签 keep-alive 容器
 * —— 所有已打开 tab 的页面组件都常驻挂载，通过 display 切换可见性，
 *    切回 tab 时 state/滚动位置/未提交表单全部保留。
 *    刷新 tab → TabsProvider 自增 version，作为 key 强制重挂载该 tab。
 */
export default function TabPagesHost() {
  const { tabs, activeKey, versions } = useTabs();

  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        const version = versions[tab.key] ?? 0;
        return (
          <div
            key={tab.key}
            style={{
              display: isActive ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <React.Fragment key={`${tab.key}-${version}`}>
              {renderRegistryPage(tab.key)}
            </React.Fragment>
          </div>
        );
      })}
    </>
  );
}
