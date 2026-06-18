'use client';

import { useEffect, useState } from 'react';
import {
  Avatar,
  Descriptions,
  Modal,
  Rate,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { request } from '@/lib/request';
import { formatDateTime } from '@/lib/format';

const { Paragraph, Text } = Typography;

export interface FeedbackDetail {
  id: number;
  submitterUsername: string;
  submitterNickname: string | null;
  submitterRole: string;
  type: string;
  priority: string;
  title: string;
  content: string;
  contact: string | null;
  satisfaction: number | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  bug: { text: '问题反馈', color: 'red' },
  feature: { text: '功能建议', color: 'gold' },
  experience: { text: '体验吐槽', color: 'blue' },
  other: { text: '其他', color: 'default' },
};

const PRIORITY_LABEL: Record<string, { text: string; color: string }> = {
  low: { text: '不急', color: 'default' },
  medium: { text: '一般', color: 'blue' },
  high: { text: '比较急', color: 'volcano' },
};

const ROLE_LABEL: Record<string, string> = {
  USER: '普通用户',
  ADMIN: '管理员',
  SUPER_ADMIN: '超级管理员',
};

interface Props {
  feedbackId: number | null;
  open: boolean;
  onClose: () => void;
  /** 详情加载完成（已标记为已读）后回调，用于刷新未读数 */
  onViewed?: () => void;
}

export default function FeedbackDetailModal({ feedbackId, open, onClose, onViewed }: Props) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);

  useEffect(() => {
    if (!open || feedbackId == null) return;
    let active = true;
    setLoading(true);
    setDetail(null);
    request<FeedbackDetail>(`/api/feedback/${feedbackId}`)
      .then((res) => {
        if (!active) return;
        setDetail(res.data);
        onViewed?.();
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // onViewed 故意不入依赖，避免重复请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feedbackId]);

  const type = detail ? TYPE_LABEL[detail.type] ?? { text: detail.type, color: 'default' } : null;
  const priority = detail
    ? PRIORITY_LABEL[detail.priority] ?? { text: detail.priority, color: 'default' }
    : null;
  const name = detail ? detail.submitterNickname || detail.submitterUsername : '';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="反馈详情"
      width={560}
      destroyOnHidden
    >
      {loading || !detail ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Avatar style={{ backgroundColor: '#1677ff' }}>
              {name[0]?.toUpperCase() || '?'}
            </Avatar>
            <div>
              <Text strong>{name}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  @{detail.submitterUsername} · {ROLE_LABEL[detail.submitterRole] ?? detail.submitterRole}
                </Text>
              </div>
            </div>
          </div>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="标题">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="类型">
              {type && <Tag color={type.color}>{type.text}</Tag>}
              {priority && <Tag color={priority.color}>{priority.text}</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="详细描述">
              <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {detail.content}
              </Paragraph>
            </Descriptions.Item>
            {detail.contact && (
              <Descriptions.Item label="联系方式">{detail.contact}</Descriptions.Item>
            )}
            {detail.satisfaction != null && (
              <Descriptions.Item label="满意度">
                <Rate disabled value={detail.satisfaction} />
              </Descriptions.Item>
            )}
            <Descriptions.Item label="提交时间">
              {formatDateTime(detail.createdAt)}
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </Modal>
  );
}
