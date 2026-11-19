'use client';

import type { ComponentType } from 'react';
import BlankFill from '@/components/exam/questions/blank-fill';
import BooleanChoice from '@/components/exam/questions/boolean-choice';
import MultipleChoice from '@/components/exam/questions/multiple-choice';
import SingleChoice from '@/components/exam/questions/single-choice';
import type { QuestionAnswerProps } from '@/components/exam/questions/types';
import { emptyPayload } from '@/lib/exam/answers';
import type { QuestionType } from '@/lib/exam/types';

/**
 * 题型子组件注册表。
 * 新增题型：实现一个子组件，在这里登记，并在 lib/exam/question-types.ts 补约定。
 * 作答写入仍走同一个 updateAnswer。
 */
export const QUESTION_COMPONENTS: Record<QuestionType, ComponentType<QuestionAnswerProps>> = {
  single: SingleChoice,
  multiple: MultipleChoice,
  boolean: BooleanChoice,
  blank: BlankFill,
};

export function ExamQuestionBody(props: QuestionAnswerProps) {
  const Component = QUESTION_COMPONENTS[props.question.type];
  const payload = props.payload.type === props.question.type ? props.payload : emptyPayload(props.question);
  return <Component {...props} payload={payload} />;
}
