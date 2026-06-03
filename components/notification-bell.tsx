'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Dropdown, Empty, Tag, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { request } from '@/lib/request';
import { canReceiveFeedback } from '@/lib/feedback';
import FeedbackDetailModal from '@/components/feedback/FeedbackDetailModal';

const { Text } = Typography;

interface FeedbackListItem {
  id: number;
  submitterUsername: string;
  submitterNickname: string | null;
  submitterRole: string;
  type: string;
  title: string;
  createdAt: string;
  read: boolean;
}

const TYPE_COLOR: Record<string, string> = {
  bug: 'red',
  feature: 'gold',
  experience: 'blue',
  other: 'default',
};
const TYPE_TEXT: Record<string, string> = {
  bug: '问题',
  feature: '建议',
  experience: '吐槽',
  other: '其他',
};

const POLL_INTERVAL = 60_000;

export default function NotificationBell({ role }: { role: string }) {
  const canReceive = canReceiveFeedback(role);

  const [list, setList] = useState<FeedbackListItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!canReceive) return;
    try {
      const res = await request<{ list: FeedbackListItem[]; unread: number }>('/api/feedback');
      setList(res.data.list);
      setUnread(res.data.unread);
    } catch {
      // 静默失败，避免打扰
    }
  }, [canReceive]);

  useEffect(() => {
    if (!canReceive) return;
    load();
    const timer = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [canReceive, load]);

  const openDetail = (id: number) => {
    setActiveId(id);
    setModalOpen(true);
  };

  // 普通用户不接收反馈：渲染一个静态、无角标的铃铛即可
  if (!canReceive) {
    return (
      <Button
        type="text"
        aria-label="消息"
        icon={<BellOutlined />}
        style={{ width: 36, height: 36, fontSize: 17 }}
      />
    );
  }

  const recent = list.slice(0, 8);

  const dropdownContent = (
    <div
      style={{
        width: 320,
        maxHeight: 420,
        overflowY: 'auto',
        background: 'var(--bg-container)',
        borderRadius: 8,
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          fontWeight: 600,
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>收到的反馈</span>
        {unread > 0 && <Text type="secondary" style={{ fontWeight: 400 }}>{unread} 条未读</Text>}
      </div>

      {recent.length === 0 ? (
        <div style={{ padding: 24 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无反馈" />
        </div>
      ) : (
        recent.map((item) => {
          const name = item.submitterNickname || item.submitterUsername;
          return (
            <div
              key={item.id}
              onClick={() => openDetail(item.id)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                background: item.read ? 'transparent' : 'var(--bg-hover, rgba(22,119,255,0.06))',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = item.read
                  ? 'transparent'
                  : 'var(--bg-hover, rgba(22,119,255,0.06))')
              }
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {!item.read && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#1677ff',
                      flexShrink: 0,
                    }}
                  />
                )}
                <Tag color={TYPE_COLOR[item.type]} style={{ marginInlineEnd: 0, fontSize: 11 }}>
                  {TYPE_TEXT[item.type] ?? item.type}
                </Tag>
                <Text strong ellipsis style={{ fontSize: 13, flex: 1 }}>
                  {item.title}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {name} · {new Date(item.createdAt).toLocaleString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <Dropdown
        popupRender={() => dropdownContent}
        placement="bottomRight"
        trigger={['click']}
        arrow
      >
        <Badge count={unread} size="small" offset={[-6, 6]}>
          <Button
            type="text"
            aria-label="消息"
            icon={<BellOutlined />}
            style={{ width: 36, height: 36, fontSize: 17 }}
          />
        </Badge>
      </Dropdown>

      <FeedbackDetailModal
        feedbackId={activeId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onViewed={load}
      />
    </>
  );
}
