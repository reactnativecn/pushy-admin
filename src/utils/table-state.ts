import type { TablePaginationConfig } from 'antd/es/table';
import type {
  FilterValue,
  SorterResult,
  SortOrder,
} from 'antd/es/table/interface';
import { useEffect, useState } from 'react';
import { type SetURLSearchParams, useSearchParams } from 'react-router-dom';
import { patchSearchParams } from '@/utils/helper';
import { useIsMobile } from '@/utils/responsive';

/**
 * URL 驱动的表格状态(分页 / 关键字 / 排序 / 列筛选)。
 * 状态全部放在 search params 里,刷新、后退、分享链接都能还原;
 * 这里只负责"URL <-> 表格"的搬运,业务筛选值仍由页面自行从 searchParams 解析。
 */

export type SortDirection = 'asc' | 'desc';

/** 关键字输入 -> URL 的防抖间隔,和以前各页面手写的一致 */
const SEARCH_DEBOUNCE_MS = 300;

export const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseOptionalPositiveInt = (value: string | null) => {
  const parsed = Number(value);
  return value && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

/** 移动端一屏放不下太多行,默认每页少一点 */
export const getDefaultPageSize = (isMobile: boolean) => (isMobile ? 10 : 20);

export interface UrlTableStateOptions {
  /** 关键字在 URL 里的参数名(历史原因各页不同,默认 search) */
  searchParam?: string;
  /** 允许写入 orderBy 的列;不传则该表不支持排序 */
  sortableColumns?: ReadonlySet<string>;
  /** 走表头筛选的列 key,handleTableChange 会把单选值同步到同名 URL 参数 */
  filterKeys?: readonly string[];
  /** 把表头筛选值归一化后再写 URL;返回 undefined 表示清掉该参数 */
  normalizeFilter?: (
    key: string,
    value: string | undefined,
  ) => string | undefined;
}

export interface UrlTableState {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  isMobile: boolean;
  page: number;
  pageSize: number;
  /** URL 中已生效(trim 后)的关键字 */
  searchQuery: string;
  /** 输入框受控值,防抖后才写入 URL */
  searchInput: string;
  setSearchInput: (value: string) => void;
  orderBy: string | undefined;
  order: SortDirection | undefined;
  /** 给列的 sortOrder 用,让表头箭头和 URL 保持一致 */
  sortOrderOf: (field: string) => SortOrder | undefined;
  handleTableChange: (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<any> | SorterResult<any>[],
  ) => void;
}

const firstFilterValue = (
  filters: Record<string, FilterValue | null>,
  key: string,
) => {
  const raw = filters[key]?.[0];
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return undefined;
  }
  return String(raw) || undefined;
};

export const useUrlTableState = ({
  searchParam = 'search',
  sortableColumns,
  filterKeys = [],
  normalizeFilter,
}: UrlTableStateOptions = {}): UrlTableState => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get(searchParam)?.trim() ?? '';
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(
    searchParams.get('pageSize'),
    getDefaultPageSize(isMobile),
  );
  const orderByParam = searchParams.get('orderBy') ?? undefined;
  const orderBy =
    orderByParam && sortableColumns?.has(orderByParam)
      ? orderByParam
      : undefined;
  const order: SortDirection | undefined =
    searchParams.get('order') === 'asc' ? 'asc' : orderBy ? 'desc' : undefined;

  const [searchInput, setSearchInput] = useState(searchQuery);

  // URL 被外部改动(后退、清空)时把输入框拉齐
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const trimmedKeyword = searchInput.trim();
    if (trimmedKeyword === searchQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      patchSearchParams(setSearchParams, {
        [searchParam]: trimmedKeyword || undefined,
        page: '1',
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, searchQuery, searchParam, setSearchParams]);

  const sortOrderOf = (field: string): SortOrder | undefined =>
    orderBy === field ? (order === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: UrlTableState['handleTableChange'] = (
    pagination,
    filters,
    sorter,
  ) => {
    const patch: Record<string, string | undefined> = {
      page: String(pagination.current ?? 1),
      pageSize: String(pagination.pageSize ?? pageSize),
    };

    for (const key of filterKeys) {
      const value = firstFilterValue(filters, key);
      patch[key] = normalizeFilter ? normalizeFilter(key, value) : value;
    }

    if (sortableColumns) {
      const single = Array.isArray(sorter) ? sorter[0] : sorter;
      const field =
        single?.order && typeof single.field === 'string'
          ? single.field
          : undefined;
      patch.orderBy = field && sortableColumns.has(field) ? field : undefined;
      patch.order =
        field && single?.order
          ? single.order === 'ascend'
            ? 'asc'
            : 'desc'
          : undefined;
    }

    patchSearchParams(setSearchParams, patch);
  };

  return {
    searchParams,
    setSearchParams,
    isMobile,
    page,
    pageSize,
    searchQuery,
    searchInput,
    setSearchInput,
    orderBy,
    order,
    sortOrderOf,
    handleTableChange,
  };
};

/**
 * 当前页超出总页数时回拉到最后一页(删除、筛选后常见)。
 * ready 为 false 时不动:keepPreviousData 的占位 total 是上一份数据的,
 * 拿它来夹页会把刚翻到的页拉回去。
 */
export const usePageClamp = (
  {
    page,
    pageSize,
    setSearchParams,
  }: Pick<UrlTableState, 'page' | 'pageSize' | 'setSearchParams'>,
  total: number,
  ready: boolean,
) => {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (ready && page > maxPage) {
      patchSearchParams(setSearchParams, { page: String(maxPage) });
    }
  }, [ready, page, maxPage, setSearchParams]);
};

/** 各列表页共用的分页配置:移动端走简洁模式,桌面端开快速跳转和每页条数 */
export const getTablePagination = (
  {
    isMobile,
    page,
    pageSize,
  }: Pick<UrlTableState, 'isMobile' | 'page' | 'pageSize'>,
  total: number,
  showTotal: (count: number) => string,
): TablePaginationConfig => ({
  current: page,
  pageSize,
  total,
  simple: isMobile,
  showQuickJumper: !isMobile,
  showSizeChanger: !isMobile,
  showTotal: isMobile ? undefined : showTotal,
});
