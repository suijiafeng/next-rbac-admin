interface PaginationOptions {
  defaultPageSize?: number;
  maxPageSize?: number;
}

function toInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function parsePagination(
  searchParams: URLSearchParams,
  options: PaginationOptions = {},
) {
  const defaultPageSize = options.defaultPageSize ?? 10;
  const maxPageSize = options.maxPageSize ?? 100;
  const page = Math.max(1, toInteger(searchParams.get('page'), 1));
  const pageSize = clamp(
    toInteger(searchParams.get('pageSize'), defaultPageSize),
    1,
    maxPageSize,
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
