import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import dayjs from 'dayjs';
import i18n from '@/i18n';
import { api } from '@/services/api';
import type { Quota, Tier } from '@/types';
import { ANNUAL_BILLING_MONTHS } from '@/utils/billing';
import { isValidExternalUrl } from '@/utils/helper';
import { userKeys } from '@/utils/query-keys';
import { type products, quotas } from '../../constants/quotas';

export type ProductTier = keyof typeof products;
export type PurchasableTier = Exclude<ProductTier, 'free' | 'custom'>;
export type OrderQuotes = NonNullable<
  Awaited<ReturnType<typeof api.getOrderQuotes>>
>;

const PURCHASABLE_TIER_KEYS: PurchasableTier[] = [
  'standard',
  'premium',
  'pro',
  'vip1',
  'vip2',
  'vip3',
];

export const getPurchasableTiers = (
  t: (key: string) => string,
): Array<{
  label: string;
  tier: PurchasableTier;
}> => [
  { label: t('user.purchasable_tiers.standard'), tier: 'standard' },
  { label: t('user.purchasable_tiers.premium'), tier: 'premium' },
  { label: t('user.purchasable_tiers.pro'), tier: 'pro' },
  { label: t('user.purchasable_tiers.vip1'), tier: 'vip1' },
  { label: t('user.purchasable_tiers.vip2'), tier: 'vip2' },
  { label: t('user.purchasable_tiers.vip3'), tier: 'vip3' },
];

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
  return {
    annualBillingMonths: data?.annualBillingMonths ?? ANNUAL_BILLING_MONTHS,
    checkUpdateAddon: data?.checkUpdateAddon,
  };
}

export function formatMoney(value: number) {
  return Number.isInteger(value) ? `￥${value}` : `￥${value.toFixed(2)}`;
}

export function formatDiscount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

export function isPurchasableTier(tier?: string): tier is PurchasableTier {
  return !!tier && PURCHASABLE_TIER_KEYS.includes(tier as PurchasableTier);
}

export function getPurchasableTierLabel(
  tier: PurchasableTier,
  t: (key: string) => string,
) {
  return (
    getPurchasableTiers(t).find((option) => option.tier === tier)?.label ?? tier
  );
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

export async function purchase(tier: ProductTier, months?: number) {
  const orderResponse = await api.createOrder({ months, tier });
  if (orderResponse?.payUrl && isValidExternalUrl(orderResponse.payUrl)) {
    window.location.href = orderResponse.payUrl;
  } else if (orderResponse?.payUrl) {
    console.error('Invalid payment URL:', orderResponse.payUrl);
    message.error(i18n.t('user.payment_invalid'));
  }
}

export async function purchaseCheckUpdateAddon(units: number) {
  const orderResponse = await api.createOrder({ checkUpdateAddonUnits: units });
  if (orderResponse?.payUrl && isValidExternalUrl(orderResponse.payUrl)) {
    window.location.href = orderResponse.payUrl;
  } else if (orderResponse?.payUrl) {
    console.error('Invalid payment URL:', orderResponse.payUrl);
    message.error(i18n.t('user.payment_invalid'));
  }
}
