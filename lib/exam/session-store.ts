'use client';

import { create } from 'zustand';
import { updateAnswer as writeAnswer } from '@/lib/exam/answers';
import { DEMO_POINTS_LEDGER } from '@/lib/exam/demo-points';
import type {
  AnswerMap,
  AnswerPayload,
  GradeResult,
  PointsEntry,
  PointsView,
  PublicPaper,
  QuestionRef,
} from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

const STORAGE_KEY = 'next-rbac-admin-exam-demo';

export interface ExamSessionState {
  paper: PublicPaper | null;
  answers: AnswerMap;
  startedAt: number | null;
  submittedAt: number | null;
  grade: GradeResult | null;
  ledger: PointsEntry[];
  lastSavedAt: number | null;
  loadSaved: () => boolean;
  startPaper: (paper: PublicPaper, now?: number) => void;
  updateAnswer: (question: QuestionRef, payload: AnswerPayload, now?: number) => void;
  commitGrade: (grade: GradeResult, now?: number) => void;
  resetSession: () => void;
}

export const initialExamSessionState = {
  paper: null as PublicPaper | null,
  answers: {} as AnswerMap,
  startedAt: null as number | null,
  submittedAt: null as number | null,
  grade: null as GradeResult | null,
  ledger: DEMO_POINTS_LEDGER,
  lastSavedAt: null as number | null,
};

interface SavedProgress {
  paper: PublicPaper;
  answers: AnswerMap;
  startedAt: number;
  submittedAt: number | null;
}

function readProgress(): SavedProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (!parsed?.paper || parsed.submittedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeProgress(state: Pick<ExamSessionState, 'paper' | 'answers' | 'startedAt' | 'submittedAt'>) {
  if (typeof window === 'undefined' || !state.paper || state.startedAt === null) return;
  const payload: SavedProgress = {
    paper: state.paper,
    answers: state.answers,
    startedAt: state.startedAt,
    submittedAt: state.submittedAt,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export const useExamSessionStore = create<ExamSessionState>((set, get) => ({
  ...initialExamSessionState,
  loadSaved: () => {
    const saved = readProgress();
    if (!saved) return false;
    set({
      paper: saved.paper,
      answers: saved.answers,
      startedAt: saved.startedAt,
      submittedAt: null,
      grade: null,
      lastSavedAt: saved.startedAt,
    });
    return true;
  },
  startPaper: (paper, now = Date.now()) => {
    const current = get();
    const sameOpenAttempt =
      current.paper?.id === paper.id && current.submittedAt === null && current.startedAt !== null;
    const saved = !sameOpenAttempt && readProgress()?.paper.id === paper.id ? readProgress() : null;
    const startedAt = sameOpenAttempt ? current.startedAt : saved?.startedAt ?? now;
    const answers = sameOpenAttempt ? current.answers : saved?.answers ?? {};
    set({
      paper,
      answers,
      startedAt,
      submittedAt: null,
      grade: null,
      lastSavedAt: saved ? saved.startedAt : null,
    });
    writeProgress(get());
  },
  updateAnswer: (question, payload, now = Date.now()) => {
    const current = get();
    if (!current.paper || current.submittedAt) return;
    const target = current.paper.questions.find((item) => item.id === question.id);
    if (!target || target.type !== question.type) return;
    const answers = writeAnswer(current.answers, question, payload, now);
    set({ answers, lastSavedAt: now });
    writeProgress({ ...current, answers });
  },
  commitGrade: (grade, now = Date.now()) => {
    const current = get();
    const entry: PointsEntry = {
      id: `live-${grade.paperId}-${now}`,
      title: grade.paperTitle,
      delta: grade.pointsAwarded,
      at: new Date(now).toISOString(),
      dataSource: DEMO_DATA_LABEL,
    };
    set({
      grade,
      submittedAt: now,
      ledger: [entry, ...current.ledger.filter((item) => item.id !== entry.id)],
    });
    writeProgress({ ...get(), submittedAt: now });
  },
  resetSession: () => {
    set({ ...initialExamSessionState, ledger: DEMO_POINTS_LEDGER });
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  },
}));

/** 成绩页只订阅判分结果。 */
export function selectGrade(state: ExamSessionState): GradeResult | null {
  return state.grade;
}

const pointsViewCache: {
  ledger?: PointsEntry[];
  grade?: GradeResult | null;
  view?: PointsView;
} = {};

/** 积分页只订阅积分视图，不读取作答明细。引用不变时复用同一对象。 */
export function selectPointsView(state: ExamSessionState): PointsView {
  if (
    pointsViewCache.ledger === state.ledger &&
    pointsViewCache.grade === state.grade &&
    pointsViewCache.view
  ) {
    return pointsViewCache.view;
  }
  const view: PointsView = {
    balance: state.ledger.reduce((sum, entry) => sum + entry.delta, 0),
    latestDelta: state.grade ? state.grade.pointsAwarded : null,
    ledger: state.ledger,
    dataSource: DEMO_DATA_LABEL,
  };
  pointsViewCache.ledger = state.ledger;
  pointsViewCache.grade = state.grade;
  pointsViewCache.view = view;
  return view;
}

export function selectAnswers(state: ExamSessionState): AnswerMap {
  return state.answers;
}

export function selectDeadline(state: ExamSessionState): number | null {
  if (!state.paper || state.startedAt === null) return null;
  return state.startedAt + state.paper.durationSec * 1000;
}
