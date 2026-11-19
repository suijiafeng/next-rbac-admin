import type { AnswerPayload, PublicQuestion } from '@/lib/exam/types';

export interface QuestionAnswerProps {
  question: PublicQuestion;
  payload: AnswerPayload;
  disabled?: boolean;
  onChange: (payload: AnswerPayload) => void;
}
