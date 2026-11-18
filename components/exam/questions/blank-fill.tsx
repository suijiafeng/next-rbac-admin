'use client';

import { Input } from 'antd';
import type { QuestionAnswerProps } from '@/components/exam/questions/types';

export default function BlankFill(props: QuestionAnswerProps) {
  const { question, payload, disabled, onChange } = props;
  const value = payload.type === 'blank' ? payload.text : '';
  return (
    <Input
      disabled={disabled}
      value={value}
      maxLength={200}
      placeholder="填写答案"
      data-testid={`blank-${question.id}`}
      onChange={(event) => onChange({ type: 'blank', text: event.target.value })}
    />
  );
}
