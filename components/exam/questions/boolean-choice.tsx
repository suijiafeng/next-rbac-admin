'use client';

import { Radio } from 'antd';
import type { QuestionAnswerProps } from '@/components/exam/questions/types';

export default function BooleanChoice(props: QuestionAnswerProps) {
  const { question, payload, disabled, onChange } = props;
  const value = payload.type === 'boolean' && payload.value !== null ? String(payload.value) : undefined;
  return (
    <Radio.Group
      disabled={disabled}
      value={value}
      onChange={(event) => onChange({ type: 'boolean', value: event.target.value === 'true' })}
    >
      <Radio value="true" data-testid={`option-${question.id}-true`}>正确</Radio>
      <Radio value="false" data-testid={`option-${question.id}-false`}>错误</Radio>
    </Radio.Group>
  );
}
