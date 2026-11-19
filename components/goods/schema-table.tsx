'use client';

import type { ReactNode } from 'react';
import { Table, Tag } from 'antd';
import type { ColumnSchema } from '@/lib/goods/schema';
import type { GoodsRecord } from '@/lib/goods/types';

interface SchemaTableProps {
  columns: ColumnSchema[];
  rows: GoodsRecord[];
  t: (key: string) => string;
  loading?: boolean;
  renderActions?: (row: GoodsRecord) => ReactNode;
}

export default function SchemaTable(props: SchemaTableProps) {
  const { columns, rows, t, renderActions } = props;
  const tableColumns = [
    ...columns.map((column) => ({
      title: t(column.labelKey),
      dataIndex: column.key,
      key: column.key,
      render: (value: unknown, row: GoodsRecord) => {
        if (column.key === 'reviewStatus') {
          return <Tag>{t(`goods.status.${row.reviewStatus}`)}</Tag>;
        }
        if (column.key === 'category' || column.key === 'shelfChannel') {
          const text = value ? String(value) : '—';
          const optionKey =
            column.key === 'category'
              ? text === 'demo-a'
                ? 'goods.option.categoryA'
                : text === 'demo-b'
                  ? 'goods.option.categoryB'
                  : ''
              : text === 'demo-shop'
                ? 'goods.option.channelShop'
                : text === 'demo-window'
                  ? 'goods.option.channelWindow'
                  : '';
          return optionKey ? t(optionKey) : text;
        }
        return value === null || value === undefined || value === '' ? '—' : String(value);
      },
    })),
    ...(renderActions
      ? [{
          title: t('goods.field.actions'),
          key: 'actions',
          render: (_: unknown, row: GoodsRecord) => renderActions(row),
        }]
      : []),
  ];

  return (
    <Table
      rowKey="id"
      pagination={false}
      dataSource={rows}
      columns={tableColumns}
      loading={props.loading}
      scroll={{ x: 640 }}
      locale={{ emptyText: t('goods.empty') }}
    />
  );
}
