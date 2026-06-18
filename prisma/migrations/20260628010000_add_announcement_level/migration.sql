-- 公告等级：info 普通 / warning 重要 / critical 紧急
ALTER TABLE "announcements" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'info';
