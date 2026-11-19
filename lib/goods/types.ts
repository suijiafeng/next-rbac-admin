export type GoodsStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface GoodsRecord {
  id: number;
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  stock: number;
  reviewStatus: GoodsStatus;
  shelfChannel: string | null;
  shelfTitle: string | null;
  shelfPriceCents: number | null;
  authorUsername: string;
  reviewerUsername: string | null;
  dataSource: '演示数据';
}
