/**
 * 培训考试的共享类型。
 * 作者 suijiafeng 的个人演示，不是任何公司或客户项目。
 * 题目、作答、成绩、积分、看板样本都标成「演示数据」，不代表真实指标。
 */

export const DEMO_DATA_LABEL = '演示数据' as const;

/** 统计口径固定在这一刻，避免把演示样本伪装成「今天的真实成绩」。 */
export const DEMO_CLOCK = '2026-11-18T00:00:00.000Z';

export const QUESTION_TYPES = ['single', 'multiple', 'boolean', 'blank'] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface QuestionOption {
  id: string;
  text: string;
}

/**
 * 统一答案载荷。四种题型共用这一层外壳：
 * 用 type 区分形状，页面、校验、判分、Zustand 都只认 AnswerRecord。
 */
export type AnswerPayload =
  | { type: 'single'; optionId: string | null }
  | { type: 'multiple'; optionIds: string[] }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'blank'; text: string };

export interface AnswerRecord {
  questionId: string;
  payload: AnswerPayload;
  updatedAt: number;
}

export type AnswerMap = Record<string, AnswerRecord>;

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  stem: string;
  score: number;
  options?: QuestionOption[];
  /** 标准答案只留在服务端判分，列表接口会剥掉。 */
  standard: AnswerPayload;
}

export type PublicQuestion = Omit<ExamQuestion, 'standard'>;

export type PaperStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExamPaper {
  id: string;
  title: string;
  summary: string;
  status: PaperStatus;
  authorUsername: string;
  durationSec: number;
  passScore: number;
  questions: ExamQuestion[];
  dataSource: typeof DEMO_DATA_LABEL;
}

export interface PublicPaper extends Omit<ExamPaper, 'questions'> {
  questions: PublicQuestion[];
  actions: ExamAction[];
}

export type ExamActor = 'learner' | 'author' | 'reviewer';

export type ExamAction =
  | 'take'
  | 'edit'
  | 'submitReview'
  | 'withdraw'
  | 'approve'
  | 'reject';

export interface GradeItem {
  questionId: string;
  earned: number;
  full: number;
  correct: boolean;
}

export interface GradeResult {
  paperId: string;
  paperTitle: string;
  earned: number;
  total: number;
  passed: boolean;
  pointsAwarded: number;
  items: GradeItem[];
  dataSource: typeof DEMO_DATA_LABEL;
}

export interface PointsEntry {
  id: string;
  title: string;
  delta: number;
  at: string;
  dataSource: typeof DEMO_DATA_LABEL;
}

export interface PointsView {
  balance: number;
  latestDelta: number | null;
  ledger: PointsEntry[];
  dataSource: typeof DEMO_DATA_LABEL;
}

export type DashboardRange = '7d' | '30d' | '90d';

export interface DashboardFilter {
  range: DashboardRange;
  department: string;
  paperId: string;
}

export interface DemoAttemptRecord {
  id: string;
  paperId: string;
  paperTitle: string;
  department: string;
  learnerLabel: string;
  score: number;
  points: number;
  submittedAt: string;
  dataSource: typeof DEMO_DATA_LABEL;
}

export interface TrendPoint {
  date: string;
  average: number;
  count: number;
}

export interface RankBar {
  department: string;
  average: number;
  count: number;
}

export interface DistSlice {
  bucket: string;
  count: number;
}

export interface QuestionRef {
  id: string;
  type: QuestionType;
  options?: QuestionOption[];
}
