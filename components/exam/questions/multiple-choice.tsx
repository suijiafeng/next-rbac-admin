'use client';

import { Checkbox, Space } from 'antd';
import type { QuestionAnswerProps } from '@/components/exam/questions/types';

export default function MultipleChoice(props: QuestionAnswerProps) {
  const { question, payload, disabled, onChange } = props;
  const value = payload.type === 'multiple' ? payload.optionIds : [];
  return (
    <Checkbox.Group
      disabled={disabled}
      value={value}
      onChange={(checked) => onChange({ type: 'multiple', optionIds: checked.map(String) })}
    >
      <Space direction="vertical" size={8}>
        {(question.options ?? []).map((option) => (
          <Checkbox key={option.id} value={option.id} data-testid={`option-${question.id}-${option.id}`}>
            {option.text}
          </Checkbox>
        ))}
      </Space>
    </Checkbox.Group>
  );
}
