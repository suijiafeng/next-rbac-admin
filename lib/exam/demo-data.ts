import type { DemoAttemptRecord, ExamPaper } from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';
import { DEMO_DEPARTMENTS } from '@/lib/exam/demo-meta';
import { DEMO_POINTS_LEDGER } from '@/lib/exam/demo-points';

export { DEMO_DEPARTMENTS, DEMO_POINTS_LEDGER };

/**
 * 演示数据。
 * 试卷、历史积分、看板样本全部是虚构的，用来把作答、审批和图表联动跑通。
 * 不要把这里的分数、人数、部门排名当成真实指标。
 * 作者：suijiafeng（个人演示，不是公司或客户项目）。
 */
const introQuestions: ExamPaper['questions'] = [
  {
    id: 'q-role',
    type: 'single',
    stem: '演示题：RBAC 里的 R 通常指什么？',
    score: 25,
    options: [
      { id: 'role', text: 'Role（角色）' },
      { id: 'request', text: 'Request（请求）' },
      { id: 'route', text: 'Route（路由）' },
    ],
    standard: { type: 'single', optionId: 'role' },
  },
  {
    id: 'q-actions',
    type: 'multiple',
    stem: '演示题：下列哪些是常见的权限动作？',
    score: 25,
    options: [
      { id: 'view', text: '查看' },
      { id: 'edit', text: '编辑' },
      { id: 'compile', text: '编译安装包' },
    ],
    standard: { type: 'multiple', optionIds: ['edit', 'view'] },
  },
  {
    id: 'q-approve',
    type: 'boolean',
    stem: '演示题：学员可以审批自己参加的试卷发布。',
    score: 25,
    standard: { type: 'boolean', value: false },
  },
  {
    id: 'q-author',
    type: 'blank',
    stem: '演示题：这个个人演示模块的作者用户名是什么？',
    score: 25,
    standard: { type: 'blank', text: 'suijiafeng' },
  },
];

export const DEMO_PAPERS: ExamPaper[] = [
  {
    id: 'demo-intro',
    title: '演示试卷 · 培训考试入门',
    summary: '四道演示题，覆盖单选、多选、判断和填空。限时 10 分钟。',
    status: 'APPROVED',
    authorUsername: 'admin',
    durationSec: 600,
    passScore: 60,
    questions: introQuestions,
    dataSource: DEMO_DATA_LABEL,
  },
  {
    id: 'demo-compare',
    title: '演示试卷 · 图表筛选对照',
    summary: '只参与看板筛选，学员端同样可以作答。题目与入门卷相同，方便对照两张卷的样本。',
    status: 'APPROVED',
    authorUsername: 'admin',
    durationSec: 600,
    passScore: 60,
    questions: introQuestions.map((question) => ({ ...question, id: `compare-${question.id}` })),
    dataSource: DEMO_DATA_LABEL,
  },
  {
    id: 'demo-pending',
    title: '演示试卷 · 待审批样例',
    summary: '出题人已提交，等审核人通过或驳回。学员看不到这张卷。',
    status: 'PENDING',
    authorUsername: 'admin',
    durationSec: 600,
    passScore: 60,
    questions: introQuestions.map((question) => ({ ...question, id: `pending-${question.id}` })),
    dataSource: DEMO_DATA_LABEL,
  },
  {
    id: 'demo-draft',
    title: '演示试卷 · 草稿样例',
    summary: '还在草稿。出题人可以提交审批；题目正文在演示里不提供在线修改。',
    status: 'DRAFT',
    authorUsername: 'admin',
    durationSec: 600,
    passScore: 60,
    questions: introQuestions.map((question) => ({ ...question, id: `draft-${question.id}` })),
    dataSource: DEMO_DATA_LABEL,
  },
  {
    id: 'demo-rejected',
    title: '演示试卷 · 已驳回样例',
    summary: '审核人驳回后回到出题人，可以再次提交。',
    status: 'REJECTED',
    authorUsername: 'admin',
    durationSec: 600,
    passScore: 60,
    questions: introQuestions.map((question) => ({ ...question, id: `rejected-${question.id}` })),
    dataSource: DEMO_DATA_LABEL,
  },
];

function attempt(
  id: string,
  paperId: string,
  paperTitle: string,
  department: (typeof DEMO_DEPARTMENTS)[number],
  learnerLabel: string,
  score: number,
  submittedAt: string,
): DemoAttemptRecord {
  return {
    id,
    paperId,
    paperTitle,
    department,
    learnerLabel,
    score,
    points: score,
    submittedAt,
    dataSource: DEMO_DATA_LABEL,
  };
}

/**
 * 看板样本。日期都相对固定时钟 2026-11-18，方便测试断言筛选前后三张图一起变。
 * 人数和分数是手写的演示值。
 */
export const DEMO_ATTEMPTS: DemoAttemptRecord[] = [
  attempt('a1', 'demo-intro', '演示试卷 · 培训考试入门', '演示部门甲', '演示学员-01', 90, '2026-11-16T02:00:00.000Z'),
  attempt('a2', 'demo-intro', '演示试卷 · 培训考试入门', '演示部门甲', '演示学员-02', 80, '2026-11-13T02:00:00.000Z'),
  attempt('a3', 'demo-intro', '演示试卷 · 培训考试入门', '演示部门甲', '演示学员-03', 70, '2026-10-29T02:00:00.000Z'),
  attempt('a4', 'demo-intro', '演示试卷 · 培训考试入门', '演示部门甲', '演示学员-04', 60, '2026-10-09T02:00:00.000Z'),
  attempt('b1', 'demo-intro', '演示试卷 · 培训考试入门', '演示部门乙', '演示学员-05', 40, '2026-11-15T02:00:00.000Z'),
  attempt('b2', 'demo-intro', '演示试卷 · 培训考试入门', '演示部门乙', '演示学员-06', 50, '2026-11-08T02:00:00.000Z'),
  attempt('b3', 'demo-intro', '演示试卷 · 培训考试入门', '演示部门乙', '演示学员-07', 55, '2026-10-24T02:00:00.000Z'),
  attempt('c1', 'demo-compare', '演示试卷 · 图表筛选对照', '演示部门丙', '演示学员-08', 100, '2026-11-14T02:00:00.000Z'),
  attempt('c2', 'demo-compare', '演示试卷 · 图表筛选对照', '演示部门丙', '演示学员-09', 95, '2026-11-03T02:00:00.000Z'),
  attempt('d1', 'demo-compare', '演示试卷 · 图表筛选对照', '演示部门甲', '演示学员-10', 88, '2026-11-12T02:00:00.000Z'),
  attempt('d2', 'demo-compare', '演示试卷 · 图表筛选对照', '演示部门甲', '演示学员-11', 76, '2026-11-06T02:00:00.000Z'),
];
