'use client';

import { Input, InputNumber, Select, Typography } from 'antd';
import type { FieldSchema } from '@/lib/goods/schema';

const { Text } = Typography;

interface SchemaFormProps {
  fields: FieldSchema[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  t: (key: string) => string;
}

export default function SchemaForm(props: SchemaFormProps) {
  const { fields, values, errors, onChange, t } = props;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {fields.map((field) => {
        const error = errors[field.key];
        return (
          <label key={field.key} style={{ display: 'grid', gap: 4 }}>
            <Text>{t(field.labelKey)}</Text>
            {field.type === 'select' ? (
              <Select
                data-testid={`field-${field.key}`}
                value={(values[field.key] as string) || undefined}
                placeholder={t(field.labelKey)}
                options={(field.options ?? []).map((option) => ({
                  value: option.value,
                  label: t(option.labelKey),
                }))}
                onChange={(value) => onChange(field.key, value)}
              />
            ) : field.type === 'number' ? (
              <InputNumber
                data-testid={`field-${field.key}`}
                style={{ width: '100%' }}
                value={values[field.key] as number | undefined}
                min={field.min}
                onChange={(value) => onChange(field.key, value)}
              />
            ) : (
              <Input
                data-testid={`field-${field.key}`}
                value={String(values[field.key] ?? '')}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            )}
            {error ? <Text type="danger">{t(`goods.error.${error}`)}</Text> : null}
          </label>
        );
      })}
    </div>
  );
}
