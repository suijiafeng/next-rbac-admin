'use client';

import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useRef } from 'react';
import { useTabs } from './providers/TabsProvider';

/**
 * 多标签页 —— 渲染在 Header 下方
 * 设计：紧凑卡片式 tab，活动 tab 有底部蓝色细条 + 略亮背景
 */
export default function PageTabs() {
  const { tabs, activeKey, switchTab, closeTab, closeOthers, closeRight, closeAll, refreshTab } = useTabs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // 活动 tab 自动滚动到视野内
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeKey]);

  const buildContextMenu = (key: string, closable: boolean): MenuProps['items'] => [
    {
      key: 'refresh',
      label: '刷新',
      icon: <ReloadOutlined />,
    },
    { type: 'divider' },
    {
      key: 'close',
      label: '关闭',
      disabled: !closable,
      icon: <CloseOutlined />,
    },
    {
      key: 'close-others',
      label: '关闭其他',
    },
    {
      key: 'close-right',
      label: '关闭右侧',
    },
    {
      key: 'close-all',
      label: '关闭全部',
    },
  ];

  const handleContextAction = (action: string, key: string) => {
    switch (action) {
      case 'refresh':
        refreshTab(key);
        break;
      case 'close':
        closeTab(key);
        break;
      case 'close-others':
        closeOthers(key);
        break;
      case 'close-right':
        closeRight(key);
        break;
      case 'close-all':
        closeAll();
        break;
    }
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 52, // header height
        zIndex: 40,
        height: 38,
        background: 'var(--bg-container)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        paddingInline: 8,
        flexShrink: 0,
      }}
    >
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="page-tabs-scroll"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <Dropdown
              key={tab.key}
              trigger={['contextMenu']}
              menu={{
                items: buildContextMenu(tab.key, tab.closable),
                onClick: ({ key }) => handleContextAction(key, tab.key),
              }}
            >
              <div
                ref={isActive ? activeRef : undefined}
                onClick={() => !isActive && switchTab(tab.key)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {/* 活动指示点 */}
                {isActive && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <span>{tab.label}</span>
                {tab.closable && (
                  <span
                    role="button"
                    aria-label="关闭"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.key);
                    }}
                    style={{
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 3,
                      color: 'var(--text-tertiary)',
                      fontSize: 10,
                      marginLeft: 2,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,77,79,0.12)';
                      e.currentTarget.style.color = 'var(--color-danger)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-tertiary)';
                    }}
                  >
                    <CloseOutlined />
                  </span>
                )}
              </div>
            </Dropdown>
          );
        })}
      </div>

      {/* 右侧：刷新 + 关闭全部 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginLeft: 8,
          paddingLeft: 8,
          borderLeft: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => refreshTab(activeKey)}
          aria-label="刷新当前页"
          style={{
            width: 24,
            height: 24,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <ReloadOutlined />
        </button>
        <button
          type="button"
          onClick={closeAll}
          aria-label="关闭所有"
          title="关闭所有 tab"
          style={{
            width: 24,
            height: 24,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <CloseOutlined />
        </button>
      </div>

    </div>
  );
}
