import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import dayjs from 'dayjs';
import i18n from '@/i18n';
import { api } from '@/services/api';
import type { Quota, Tier } from '@/types';
import { isValidExternalUrl } from '@/utils/helper';
import { userKeys } from '@/utils/query-keys';
import { type products, quotas } from '../../constants/quotas';

export type ProductTier = keyof typeof products;
export type PurchasableTier = Exclude<ProductTier, 'free' | 'custom'>;
export type OrderQuotes = NonNullable<
  Awaited<ReturnType<typeof api.getOrderQuotes>>
>;

export const ANNUAL_BILLING_MONTHS = 12;

// 报价接口没给月付价时的兜底：月付单价 = 年付价 / 8，与服务端默认系数一致。
const DEFAULT_MONTHLY_PRICE_FACTOR = 8;

export function resolveMonthlyPrice(annualPrice: number) {
  const monthly = annualPrice / DEFAULT_MONTHLY_PRICE_FACTOR;
  return Math.round((monthly + Number.EPSILON) * 100) / 100;
}

// 可购买版本的名称文案 key；写成字面量查表，漏翻译能在测试里暴露。
export const PURCHASABLE_TIER_LABEL_KEY: Record<PurchasableTier, string> = {
  standard: 'user.purchasable_tiers.standard',
  premium: 'user.purchasable_tiers.premium',
  pro: 'user.purchasable_tiers.pro',
  vip1: 'user.purchasable_tiers.vip1',
  vip2: 'user.purchasable_tiers.vip2',
  vip3: 'user.purchasable_tiers.vip3',
};

const checkUpdateAddonEligibleTiers = new Set<Tier>([
  'premium',
  'pro',
  'vip1',
  'vip2',
  'vip3',
]);

export function useOrderBillingConfig() {
  const { data } = useQuery({
    queryKey: userKeys.orderBillingConfig(),
    queryFn: async () => {
      try {
        return await api.getOrderBillingConfig();
      } catch {
        return undefined;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
  return { checkUpdateAddon: data?.checkUpdateAddon };
}

export function formatMoney(value: number) {
  return Number.isInteger(value) ? `￥${value}` : `￥${value.toFixed(2)}`;
}

export function formatDiscount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * 年付相对「按月付满 billingMonths 个月」的折扣（如 "8.3" 折）；
 * 年付不比按月便宜时返回 undefined，不展示折扣标签。
 */
export function getAnnualDiscount({
  annualPrice,
  billingMonths = ANNUAL_BILLING_MONTHS,
  monthlyPrice,
}: {
  annualPrice: number;
  billingMonths?: number;
  monthlyPrice: number;
}) {
  const monthlyTotal = monthlyPrice * billingMonths;
  return monthlyTotal > annualPrice
    ? formatDiscount((annualPrice / monthlyTotal) * 10)
    : undefined;
}

export function getRemainingBillableDays(expiresAt?: string, now?: string) {
  if (!expiresAt) {
    return null;
  }
  const days = dayjs(expiresAt).add(1, 'day').diff(dayjs(now), 'day');
  return days > 0 ? days : null;
}

export function formatExpireDate(
  expiresAt: string | undefined,
  t: (key: string) => string,
) {
  return expiresAt
    ? dayjs(expiresAt).format(t('user.date_format'))
    : t('user.current_expire');
}

export function formatRenewedExpireDate(
  {
    expiresAt,
    months,
    now,
  }: {
    expiresAt?: string;
    months: number;
    now?: string;
  },
  t: (key: string) => string,
) {
  const currentExpireDay = expiresAt ? dayjs(expiresAt) : null;
  const nowDay = dayjs(now);
  const baseDay = currentExpireDay?.isAfter(nowDay) ? currentExpireDay : nowDay;
  return baseDay.add(months, 'month').format(t('user.date_format'));
}

export function formatWan(value: number, t: (key: string) => string) {
  return `${value / 10_000}${t('user.wan_unit')}`;
}

// 年付赠送的 Token（美元）。只有整单年付送，月付、升级补差价、加购、定制版和大客户不送；
// 数字要和 pushy-go internal/order/ai_bonus.go 保持一致。
const ANNUAL_TOKEN_BONUS: Partial<Record<string, number>> = {
  standard: 30,
  premium: 100,
  pro: 360,
};

export function getAnnualTokenBonus(tier?: string) {
  return (tier && ANNUAL_TOKEN_BONUS[tier]) || 0;
}

export function isPurchasableTier(tier?: string): tier is PurchasableTier {
  return !!tier && Object.hasOwn(PURCHASABLE_TIER_LABEL_KEY, tier);
}

export function getPurchasableTierLabel(
  tier: PurchasableTier,
  t: (key: string) => string,
) {
  return t(PURCHASABLE_TIER_LABEL_KEY[tier]);
}

export function getQuotaDetailItems(
  tier: PurchasableTier,
  t: (key: string) => string,
) {
  const quota = quotas[tier];
  return [
    {
      label: t('user.check_quota_daily'),
      value: formatWan(quota.pv, t),
    },
    {
      label: t('user.app_count'),
      value: `${quota.app.toLocaleString()} ${t('user.count_unit')}`,
    },
    {
      label: t('user.native_pkg_count'),
      value: `${quota.package.toLocaleString()} ${t('user.count_unit')}`,
    },
    {
      label: t('user.hotfix_count'),
      value: `${quota.bundle.toLocaleString()} ${t('user.count_unit')}`,
    },
  ];
}

export function canPurchaseCheckUpdateAddon({
  dailyQuota,
  quota,
  tier,
  tierExpiresAt,
}: {
  dailyQuota: number;
  quota?: Quota;
  tier: Tier;
  tierExpiresAt?: string;
}) {
  if (tier === 'free' || !tierExpiresAt) {
    return false;
  }
  if (tier === 'custom') {
    if (quota?.base) {
      return checkUpdateAddonEligibleTiers.has(quota.base);
    }
    return dailyQuota >= quotas.premium.pv;
  }
  return checkUpdateAddonEligibleTiers.has(tier);
}

export const getDefaultCheckUpdateAddonEligibilityHint = (
  t: (key: string) => string,
) => t('user.addon_eligible_hint');

// 下单成功后跳转到支付页；支付地址不合法时只提示，不跳转。
function redirectToPay(orderResponse?: { payUrl?: string }) {
  const payUrl = orderResponse?.payUrl;
  if (!payUrl) {
    return;
  }
  if (isValidExternalUrl(payUrl)) {
    window.location.href = payUrl;
  } else {
    console.error('Invalid payment URL:', payUrl);
    message.error(i18n.t('user.payment_invalid'));
  }
}

export async function purchase(tier: ProductTier, months?: number) {
  redirectToPay(await api.createOrder({ months, tier }));
}

export async function purchaseCheckUpdateAddon(units: number) {
  redirectToPay(await api.createOrder({ checkUpdateAddonUnits: units }));
}
