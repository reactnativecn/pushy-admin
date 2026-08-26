import { parseOptionalPositiveInt } from '@/utils/table-state';

/** 应用管理页的纯逻辑:表格 URL 配置与筛选值归一化 */

// checkCount 由 Redis 事后统计,不在 SQL 里,因此不参与排序。
export const SORTABLE_COLUMNS = new Set([
  'id',
  'name',
  'appKey',
  'platform',
  'userId',
  'status',
  'ignoreBuildTime',
  'createdAt',
]);

export const PLATFORM_VALUES = ['ios', 'android', 'harmony'];
export const STATUS_VALUES = ['normal', 'paused'];

// 表头筛选列,值同步到同名 URL 参数
export const FILTER_KEYS = ['platform', 'status', 'userId'] as const;

// 用户 id 是手输的,先归一化再写回 URL,避免 "0"/"abc" 留下一个不生效的筛选。
export const normalizeFilter = (key: string, value: string | undefined) => {
  if (key !== 'userId') {
    return value;
  }
  const userId = parseOptionalPositiveInt(value ?? null);
  return userId ? String(userId) : undefined;
};

// URL 里的枚举值可能被手改,不在白名单内的当作没筛
const pickAllowed = (value: string | null, allowed: readonly string[]) => {
  const param = value ?? undefined;
  return param && allowed.includes(param) ? param : undefined;
};

export const parsePlatformFilter = (value: string | null) =>
  pickAllowed(value, PLATFORM_VALUES);

export const parseStatusFilter = (value: string | null) =>
  pickAllowed(value, STATUS_VALUES);
