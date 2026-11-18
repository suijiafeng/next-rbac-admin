'use client';

import { Radio, Space } from 'antd';
import type { QuestionAnswerProps } from '@/components/exam/questions/types';

export default function SingleChoice(props: QuestionAnswerProps) {
  const { question, payload, disabled, onChange } = props;
  const value = payload.type === 'single' ? payload.optionId ?? undefined : undefined;
  return (
    <Radio.Group
      disabled={disabled}
      value={value}
      onChange={(event) => onChange({ type: 'single', optionId: String(event.target.value) })}
    >
      <Space direction="vertical" size={8}>
        {(question.options ?? []).map((option) => (
          <Radio key={option.id} value={option.id} data-testid={`option-${question.id}-${option.id}`}>
            {option.text}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  );
}
