'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Space, Typography } from 'antd';
import SchemaForm from '@/components/goods/schema-form';
import SchemaTable from '@/components/goods/schema-table';
import { http } from '@/lib/http/client';
import i18n, { readStoredLanguage, switchLanguage } from '@/lib/i18n';
import { STAGE_SCHEMAS, validateBySchema, type GoodsStage } from '@/lib/goods/schema';
import type { GoodsRecord } from '@/lib/goods/types';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export default function GoodsWorkbench({ stage }: { stage: GoodsStage }) {
  const schema = STAGE_SCHEMAS[stage];
  const { t } = useTranslation();
  const [rows, setRows] = useState<GoodsRecord[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = readStoredLanguage();
    if (i18n.language !== stored) {
      void switchLanguage(stored);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<{ data: { list: GoodsRecord[] } }>('/api/goods', { params: { stage } });
      setRows(res.data.data.list);
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_CANCELED') return;
    } finally {
      setLoading(false);
    }
  }, [stage]);

  useEffect(() => {
    void load();
  }, [load]);

  const onChange = (key: string, value: unknown) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const saveDraft = async () => {
    const nextErrors = validateBySchema(schema.fields, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await http.post('/api/goods', values);
    setValues({});
    await load();
  };

  const submit = async (id: number) => {
    await http.post(`/api/goods/${id}/submit`);
    await load();
  };

  const decide = async (id: number, decision: 'approve' | 'reject') => {
    await http.post(`/api/goods/${id}/decision`, { decision });
    await load();
  };

  const saveShelf = async () => {
    if (!selectedId) return;
    const nextErrors = validateBySchema(schema.fields, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await http.post(`/api/goods/${selectedId}/shelf`, values);
    setValues({});
    await load();
  };

  return (
    <div style={{ padding: 16 }} data-testid={`goods-${stage}`}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }} data-testid="goods-title">{t(schema.titleKey)}</Title>
            <Text type="secondary">{t('goods.demo')} · {t('goods.author')}</Text>
          </div>
          <Space>
            <Button data-testid="lang-zh" onClick={() => switchLanguage('zh')}>{t('goods.lang.zh')}</Button>
            <Button data-testid="lang-en" onClick={() => switchLanguage('en')}>{t('goods.lang.en')}</Button>
          </Space>
        </div>
        <Alert type="info" showIcon message={t('goods.demo')} />
        {schema.fields.length > 0 && (
          <Card>
            <SchemaForm fields={schema.fields} values={values} errors={errors} onChange={onChange} t={t} />
            <div style={{ marginTop: 16 }}>
              {stage === 'entry' ? (
                <Button type="primary" data-testid="goods-save" onClick={saveDraft}>{t('goods.action.save')}</Button>
              ) : (
                <Button type="primary" data-testid="goods-shelf-save" onClick={saveShelf} disabled={!selectedId}>
                  {t('goods.action.shelf')}
                </Button>
              )}
            </div>
          </Card>
        )}
        <SchemaTable
          columns={schema.columns}
          rows={rows}
          loading={loading}
          t={t}
          renderActions={(row) => (
            <Space wrap>
              {stage === 'entry' && (row.reviewStatus === 'DRAFT' || row.reviewStatus === 'REJECTED') && (
                <Button size="small" data-testid={`goods-submit-${row.id}`} onClick={() => submit(row.id)}>
                  {t('goods.action.submit')}
                </Button>
              )}
              {stage === 'review' && row.reviewStatus === 'PENDING' && (
                <>
                  <Button size="small" type="primary" data-testid={`goods-approve-${row.id}`} onClick={() => decide(row.id, 'approve')}>
                    {t('goods.action.approve')}
                  </Button>
                  <Button size="small" danger data-testid={`goods-reject-${row.id}`} onClick={() => decide(row.id, 'reject')}>
                    {t('goods.action.reject')}
                  </Button>
                </>
              )}
              {stage === 'listing' && (
                <Button size="small" data-testid={`goods-pick-${row.id}`} onClick={() => setSelectedId(row.id)}>
                  {row.sku}
                </Button>
              )}
            </Space>
          )}
        />
      </Space>
    </div>
  );
}
