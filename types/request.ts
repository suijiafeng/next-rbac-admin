export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export interface PageResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}