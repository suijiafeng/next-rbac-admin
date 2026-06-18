'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Drawer, Empty, Tag, Tabs, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { request } from '@/lib/request';
import { canReceiveFeedback } from '@/lib/feedback';
import FeedbackDetailModal from '@/components/feedback/FeedbackDetailModal';
import {
  ANNOUNCEMENT_LEVEL_META,
  normalizeAnnouncementLevel,
  type AnnouncementLevel,
} from '@/constants/announcement';
import { formatDateTime } from '@/lib/format';

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

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  level: AnnouncementLevel;
  startsAt: string;
  publisherUsername: string;
}

const FEEDBACK_TYPE_COLOR: Record<string, string> = {
  bug: 'red',
  feature: 'gold',
  experience: 'blue',
  other: 'default',
};
const FEEDBACK_TYPE_TEXT: Record<string, string> = {
  bug: '问题',
  feature: '建议',
  experience: '吐槽',
  other: '其他',
};

/** 本地已读公告 id 集合 */
const READ_KEY = 'read-announcements';

function readReadIds(): Set<number> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v: unknown) => typeof v === 'number') : []);
  } catch {
    return new Set();
  }
}

function markRead(ids: number[]) {
  try {
    const existing = readReadIds();
    ids.forEach((id) => existing.add(id));
    const next = Array.from(existing);
    localStorage.setItem(READ_KEY, JSON.stringify(next));
  } catch { /* 忽略 */ }
}

const POLL_INTERVAL = 60_000;

export default function NotificationBell({ role }: { role: string }) {
  const canReceive = canReceiveFeedback(role);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('announcements');

  // 反馈
  const [feedbackList, setFeedbackList] = useState<FeedbackListItem[]>([]);
  const [feedbackUnread, setFeedbackUnread] = useState(0);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // 公告
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [annUnread, setAnnUnread] = useState(0);

  // ── 公告加载 ──────────────────────────────────────────────
  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await request<{ list: AnnouncementItem[] }>('/api/admin/announcements', {
        params: { active: 'true', pageSize: 20 },
      });
      const list = res.data.list.map((a) => ({
        ...a,
        level: normalizeAnnouncementLevel(a.level),
      }));
      setAnnouncements(list);
      const localRead = readReadIds();
      setReadIds(localRead);
      setAnnUnread(list.filter((a) => !localRead.has(a.id)).length);
    } catch { /* 静默失败 */ }
  }, []);

  // ── 反馈加载 ──────────────────────────────────────────────
  const loadFeedback = useCallback(async () => {
    if (!canReceive) return;
    try {
      const res = await request<{ list: FeedbackListItem[]; unread: number }>('/api/feedback');
      setFeedbackList(res.data.list);
      setFeedbackUnread(res.data.unread);
    } catch { /* 静默失败 */ }
  }, [canReceive]);

  useEffect(() => {
    loadAnnouncements();
    loadFeedback();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAnnouncements();
        loadFeedback();
      }
    }, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadAnnouncements();
        loadFeedback();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadAnnouncements, loadFeedback]);

  // 打开抽屉时将当前标签页的公告标记为已读
  const handleOpen = () => {
    setOpen(true);
    if (activeTab === 'announcements') {
      const ids = announcements.map((a) => a.id);
      markRead(ids);
      setReadIds(new Set(ids));
      setAnnUnread(0);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'announcements') {
      const ids = announcements.map((a) => a.id);
      markRead(ids);
      setReadIds(new Set(ids));
      setAnnUnread(0);
    }
  };

  const totalUnread = annUnread + (canReceive ? feedbackUnread : 0);

  // ── 公告列表 ──────────────────────────────────────────────
  const announcementPane = (
    <div>
      {announcements.length === 0 ? (
        <div style={{ padding: '40px 0' }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无公告" />
        </div>
      ) : (
        announcements.map((ann) => {
          const meta = ANNOUNCEMENT_LEVEL_META[ann.level];
          const isRead = readIds.has(ann.id);
          return (
            <div
              key={ann.id}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                background: isRead ? 'transparent' : 'var(--bg-hover, rgba(22,119,255,0.05))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {!isRead && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#1677ff', flexShrink: 0,
                  }} />
                )}
                <Tag color={meta.tagColor} style={{ marginInlineEnd: 0, fontSize: 11 }}>
                  {meta.label}
                </Tag>
                <Text strong style={{ fontSize: 13, flex: 1 }} ellipsis>
                  {ann.title}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                {ann.content}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {ann.publisherUsername} · {formatDateTime(ann.startsAt)}
              </Text>
            </div>
          );
        })
      )}
    </div>
  );

  // ── 反馈列表 ──────────────────────────────────────────────
  const feedbackPane = (
    <div>
      {!canReceive ? (
        <div style={{ padding: '40px 0' }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无权限查看反馈" />
        </div>
      ) : feedbackList.length === 0 ? (
        <div style={{ padding: '40px 0' }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无反馈" />
        </div>
      ) : (
        feedbackList.slice(0, 20).map((item) => {
          const name = item.submitterNickname || item.submitterUsername;
          return (
            <div
              key={item.id}
              onClick={() => { setActiveId(item.id); setFeedbackModalOpen(true); }}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                background: item.read ? 'transparent' : 'var(--bg-hover, rgba(22,119,255,0.05))',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.04))')}
              onMouseLeave={(e) => (e.currentTarget.style.background = item.read ? 'transparent' : 'var(--bg-hover, rgba(22,119,255,0.05))')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {!item.read && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#1677ff', flexShrink: 0,
                  }} />
                )}
                <Tag color={FEEDBACK_TYPE_COLOR[item.type]} style={{ marginInlineEnd: 0, fontSize: 11 }}>
                  {FEEDBACK_TYPE_TEXT[item.type] ?? item.type}
                </Tag>
                <Text strong ellipsis style={{ fontSize: 13, flex: 1 }}>
                  {item.title}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {name} · {formatDateTime(item.createdAt)}
              </Text>
            </div>
          );
        })
      )}
    </div>
  );

  const tabItems = [
    {
      key: 'announcements',
      label: (
        <Badge count={annUnread} size="small" offset={[6, -2]}>
          公告
        </Badge>
      ),
      children: announcementPane,
    },
    ...(canReceive
      ? [{
          key: 'feedback',
          label: (
            <Badge count={feedbackUnread} size="small" offset={[6, -2]}>
              反馈
            </Badge>
          ),
          children: feedbackPane,
        }]
      : []),
  ];

  return (
    <>
      <Badge count={totalUnread} size="small" offset={[-6, 6]}>
        <Button
          type="text"
          aria-label="消息"
          icon={<BellOutlined />}
          style={{ width: 36, height: 36, fontSize: 17 }}
          onClick={handleOpen}
        />
      </Badge>

      <Drawer
        title="消息"
        placement="right"
        width={380}
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          style={{ paddingInline: 16 }}
          items={tabItems}
        />
      </Drawer>

      <FeedbackDetailModal
        feedbackId={activeId}
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        onViewed={loadFeedback}
      />
    </>
  );
}
