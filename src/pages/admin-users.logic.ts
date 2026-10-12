import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { quotas } from '@/constants/quotas';
import type { AdminUser, Quota } from '@/types';
import { pickAllowed } from '@/utils/table-state';

/** 用户管理页的纯逻辑:表格 URL 配置、状态展示、配额 JSON 解析、到期时间快捷键 */

export const SORTABLE_COLUMNS = new Set([
  'id',
  'email',
  'name',
  'createdAt',
  'tier',
  'status',
  'tierExpiresAt',
]);

// 表头单选筛选,值直接同步到同名 URL 参数
export const FILTER_KEYS = ['status', 'tier'] as const;

export const statusMeta = (
  status: string | null | undefined,
  t: (key: string) => string,
) => {
  if (status === 'unverified') {
    return {
      cls: 'text-orange-500',
      label: t('admin_users.status_unverified'),
    };
  }
  if (status === 'dormant') {
    return { cls: 'text-gray-400', label: t('admin_users.status_dormant') };
  }
  return { cls: 'text-green-600', label: t('admin_users.status_normal') };
};

// 状态筛选的可选值，顺序即表头筛选菜单的顺序
export const USER_STATUS_VALUES = ['normal', 'unverified', 'dormant'] as const;

const TIER_LABEL_KEYS = {
  free: 'admin_users.tier_free',
  standard: 'admin_users.tier_standard',
  premium: 'admin_users.tier_premium',
  pro: 'admin_users.tier_pro',
  vip1: 'admin_users.tier_vip1',
  vip2: 'admin_users.tier_vip2',
  vip3: 'admin_users.tier_vip3',
  custom: 'admin_users.tier_custom',
} as const;

export const TIER_VALUES = Object.keys(TIER_LABEL_KEYS) as Array<
  keyof typeof TIER_LABEL_KEYS
>;

export const getTierOptions = (t: (key: string) => string) =>
  TIER_VALUES.map((value) => ({ value, label: t(TIER_LABEL_KEYS[value]) }));

// URL 里的筛选值可能被手改，不认识的值不发给接口
export const parseUserStatusFilter = (value: string | null) =>
  pickAllowed(value, USER_STATUS_VALUES);

export const parseTierFilter = (value: string | null) =>
  pickAllowed(value, TIER_VALUES);

export const defaultPremiumQuotaText = JSON.stringify(quotas.premium, null, 2);
export const expiryShortcutDays = [7, 30, 365] as const;

// custom 档没有现成配额时给一份高级版模板,省得从空白开始手敲
export const getInitialQuotaValue = (record: AdminUser) => {
  if (record.quota) {
    return JSON.stringify(record.quota, null, 2);
  }

  return record.tier === 'custom' ? defaultPremiumQuotaText : '';
};

/**
 * 编辑器里的配额文本 -> 提交值。空白表示清掉自定义配额(null);
 * 非法 JSON 返回 null,由调用方提示,不要把半截配额发出去。
 */
export const parseQuotaInput = (
  value: string,
): { quota: Quota | null } | null => {
  if (!value.trim()) {
    return { quota: null };
  }
  try {
    return { quota: JSON.parse(value) as Quota };
  } catch {
    return null;
  }
};

/** 已有有效到期时间就在其基础上顺延,否则从当前时刻起算 */
export const getExtendedTierExpiry = (
  currentValue: Dayjs | string | null | undefined,
  days: number,
): Dayjs => {
  const currentExpiry = currentValue ? dayjs(currentValue) : null;
  const baseDate = currentExpiry?.isValid() ? currentExpiry : dayjs();

  return baseDate.add(days, 'day');
};
