/** 公告等级 */
export type AnnouncementLevel = 'info' | 'warning' | 'critical';

export const ANNOUNCEMENT_LEVELS: AnnouncementLevel[] = ['info', 'warning', 'critical'];

export interface AnnouncementLevelMeta {
  /** 中文名 */
  label: string;
  /** antd Alert / 消费端横幅类型 */
  alertType: 'info' | 'warning' | 'error';
  /** 后台列表 Tag 颜色 */
  tagColor: string;
  /** 横幅是否允许关闭（紧急公告强制常驻，不可关闭） */
  closable: boolean;
  /** 是否在进入时弹 Modal 强提醒并要求确认 */
  modal: boolean;
}

export const ANNOUNCEMENT_LEVEL_META: Record<AnnouncementLevel, AnnouncementLevelMeta> = {
  info: { label: '普通', alertType: 'info', tagColor: 'blue', closable: true, modal: false },
  warning: { label: '重要', alertType: 'warning', tagColor: 'orange', closable: true, modal: false },
  critical: { label: '紧急', alertType: 'error', tagColor: 'red', closable: false, modal: true },
};

/** 等级在横幅中的展示优先级（数值越大越靠前 / 越严重） */
export const ANNOUNCEMENT_LEVEL_WEIGHT: Record<AnnouncementLevel, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

/** 容错：把任意输入规整为合法等级，非法值回落为 info */
export function normalizeAnnouncementLevel(value: unknown): AnnouncementLevel {
  return value === 'warning' || value === 'critical' ? value : 'info';
}
