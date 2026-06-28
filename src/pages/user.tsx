import {
  DownOutlined,
  LogoutOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Button,
  Descriptions,
  Grid,
  message,
  Popover,
  Progress,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { api } from '@/services/api';
import { logout } from '@/services/auth';
import { ANNUAL_BILLING_MONTHS } from '@/utils/billing';
import {
  CHECK_QUOTA_LOW_RATIO,
  getCheckQuotaWarningState,
} from '@/utils/check-quota-warning';
import { cn, isValidExternalUrl } from '@/utils/helper';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { PRICING_LINK } from '../constants/links';
import { type products, quotas } from '../constants/quotas';

type ProductTier = keyof typeof products;
type PurchasableTier = Exclude<ProductTier, 'free' | 'custom'>;
type OrderQuotes = NonNullable<Awaited<ReturnType<typeof api.getOrderQuotes>>>;

const PURCHASABLE_TIER_KEYS: PurchasableTier[] = [
  'standard',
  'premium',
  'pro',
  'vip1',
  'vip2',
  'vip3',
];

const getPurchasableTiers = (
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

const purchaseButtonClassName = 'w-full justify-center sm:w-[160px]';
const checkUpdateAddonEligibleTiers = new Set<Tier>([
  'premium',
  'pro',
  'vip1',
  'vip2',
  'vip3',
]);

const getInvoiceHint = (t: (key: string) => string) => (
  <div>
    <p>
      {t('user.invoice_hint_before_email')}
      <a href="mailto:hi@charmlot.com">hi@charmlot.com</a>
      {t('user.invoice_hint_after_email')}
    </p>
    <p>
      <strong>{t('user.invoice_company')}</strong>
    </p>
    <p>{t('user.invoice_default')}</p>
  </div>
);

function useOrderBillingConfig() {
  const { data } = useQuery({
    queryKey: ['orderBillingConfig'],
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

function formatMoney(value: number) {
  return Number.isInteger(value) ? `￥${value}` : `￥${value.toFixed(2)}`;
}

function formatDiscount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getRemainingBillableDays(expiresAt?: string, now?: string) {
  if (!expiresAt) {
    return null;
  }
  const days = dayjs(expiresAt).add(1, 'day').diff(dayjs(now), 'day');
  return days > 0 ? days : null;
}

function formatExpireDate(
  expiresAt: string | undefined,
  t: (key: string) => string,
) {
  return expiresAt
    ? dayjs(expiresAt).format(t('user.date_format'))
    : t('user.current_expire');
}

function formatRenewedExpireDate(
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

function formatWan(value: number, t: (key: string) => string) {
  return `${value / 10_000}${t('user.wan_unit')}`;
}

function isPurchasableTier(tier?: string): tier is PurchasableTier {
  return !!tier && PURCHASABLE_TIER_KEYS.includes(tier as PurchasableTier);
}

function getPurchasableTierLabel(
  tier: PurchasableTier,
  t: (key: string) => string,
) {
  return (
    getPurchasableTiers(t).find((option) => option.tier === tier)?.label ?? tier
  );
}

function getQuotaDetailItems(
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

function canPurchaseCheckUpdateAddon({
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

const getDefaultCheckUpdateAddonEligibilityHint = (
  t: (key: string) => string,
) => t('user.addon_eligible_hint');

type PurchaseMenuOption = {
  amountText: string;
  description?: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  disabled?: boolean;
  formula?: string;
  key: string;
  onClick?: () => Promise<void>;
  tag?: string;
  title: string;
};

function PurchaseActionPopover({
  buttonLabel,
  emptyText,
  hint,
  loading,
  title,
  titleNote,
  widthClassName = 'w-[340px]',
  options,
}: {
  buttonLabel: string;
  emptyText?: string;
  hint?: string;
  loading: boolean;
  title?: string;
  titleNote?: string;
  widthClassName?: string;
  options: PurchaseMenuOption[];
}) {
  const { t } = useTranslation();
  const resolvedEmptyText = emptyText ?? t('user.addon_empty');

  const content = (
    <div
      className={cn(
        'max-h-[70vh] max-w-[calc(100vw-32px)] overflow-y-auto pr-1',
        widthClassName,
      )}
    >
      {title && (
        <div className="px-2">
          <div className="font-semibold text-slate-900 text-sm">{title}</div>
          {titleNote && (
            <div className="mt-0.5 text-slate-500 text-xs">{titleNote}</div>
          )}
        </div>
      )}
      {hint && (
        <div className="px-2 pt-1 pb-2 text-slate-500 text-xs leading-relaxed">
          {hint}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {options.length > 0 ? (
          options.map((option) => (
            <button
              className={cn(
                'w-full rounded border border-transparent px-3 py-2 text-left transition',
                option.disabled || loading
                  ? 'cursor-not-allowed text-slate-400'
                  : 'cursor-pointer hover:border-blue-200 hover:bg-blue-50',
              )}
              disabled={option.disabled || loading}
              key={option.key}
              onClick={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await option.onClick?.();
              }}
              type="button"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span
                  className={cn(
                    'font-medium',
                    option.disabled || loading
                      ? 'text-slate-400'
                      : 'text-slate-900',
                  )}
                >
                  {option.title}
                </span>
                <span
                  className={cn(
                    'min-w-0 text-right font-semibold',
                    option.disabled || loading
                      ? 'text-slate-400'
                      : 'text-slate-900',
                  )}
                >
                  {option.amountText}
                </span>
              </div>
              {(option.description || option.tag) && (
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
                  {option.description && (
                    <span className="text-slate-500">{option.description}</span>
                  )}
                  {option.tag && (
                    <Tag color="gold" className="m-0">
                      {option.tag}
                    </Tag>
                  )}
                </div>
              )}
              {option.details && (
                <div
                  className={cn(
                    'mt-2 grid gap-1.5',
                    option.details.length >= 4 ? 'grid-cols-4' : 'grid-cols-3',
                  )}
                >
                  {option.details.map((detail) => (
                    <div
                      className="rounded bg-slate-50 px-2 py-1"
                      key={detail.label}
                    >
                      <div className="text-[10px] text-slate-400">
                        {detail.label}
                      </div>
                      <div
                        className={cn(
                          'mt-0.5 truncate font-semibold text-sm tabular-nums',
                          option.disabled || loading
                            ? 'text-slate-400'
                            : 'text-blue-700',
                        )}
                      >
                        {detail.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {option.formula && (
                <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500 tabular-nums">
                  {option.formula}
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="px-2 py-3 text-center text-slate-500 text-xs">
            {resolvedEmptyText}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      placement="bottomLeft"
      trigger={['hover', 'click']}
    >
      <Button className={purchaseButtonClassName} loading={loading}>
        <span className="inline-flex items-center gap-2">
          {buttonLabel}
          <DownOutlined className="text-[10px]" />
        </span>
      </Button>
    </Popover>
  );
}

const RenewalPurchaseButton = ({
  quotes,
  quotesLoading,
  serverTime,
  tier,
  tierExpiresAt,
}: {
  quotes?: OrderQuotes;
  quotesLoading: boolean;
  serverTime?: string;
  tier: Tier;
  tierExpiresAt?: string;
}) => {
  const { t } = useTranslation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const addonUnits = quotes?.current.checkUpdateAddonUnits ?? 0;
  const addonMonthlyPrice = quotes?.current.checkUpdateAddonMonthlyPrice ?? 0;

  if (tier === 'free') {
    return null;
  }

  const renewalOptions: PurchaseMenuOption[] = quotes?.renewals.length
    ? quotes.renewals.map((option) => {
        const billing = option.quote.billing;
        const months =
          option.months ?? billing?.requestedMonths ?? ANNUAL_BILLING_MONTHS;
        const isAnnual = billing?.billingCycle === 'year';
        const monthlyTotal =
          billing && isAnnual
            ? billing.monthlyPrice * billing.billingMonths
            : 0;

        return {
          amountText: formatMoney(option.quote.amount),
          description: `${t('user.renew_after_expire')} ${formatRenewedExpireDate(
            {
              expiresAt: tierExpiresAt,
              months,
              now: serverTime,
            },
            t,
          )}`,
          key: option.key,
          onClick: async () => {
            setLoadingPlan(option.key);
            try {
              await purchase(tier, months);
            } finally {
              setLoadingPlan(null);
            }
          },
          tag:
            billing && isAnnual && monthlyTotal > billing.annualPrice
              ? t('user.about_discount', {
                  discount: formatDiscount(
                    (billing.annualPrice / monthlyTotal) * 10,
                  ),
                })
              : undefined,
          title: isAnnual
            ? `${months} ${t('user.annual_billing')}`
            : `${months} ${t('user.price_month')}`,
        };
      })
    : [
        {
          amountText: quotesLoading
            ? t('user.quoting')
            : t('user.order_settle'),
          description: quotesLoading
            ? t('user.fetching_renewal_quote')
            : t('user.renewal_unavailable'),
          disabled: true,
          key: 'unavailable',
          title: t('user.renew'),
        },
      ];

  return (
    <PurchaseActionPopover
      buttonLabel={loadingPlan ? t('user.jumping') : t('user.renew')}
      loading={loadingPlan !== null}
      title={t('user.renew')}
      titleNote={
        addonUnits > 0
          ? t('user.addon_price_monthly', {
              price: formatMoney(addonMonthlyPrice),
            })
          : undefined
      }
      options={renewalOptions}
    />
  );
};

const UpgradePurchaseControls = ({
  currentTier,
  quotes,
  quotesLoading,
  serverTime,
  tierExpiresAt,
}: {
  currentTier: Tier;
  quotes?: OrderQuotes;
  quotesLoading: boolean;
  serverTime?: string;
  tierExpiresAt?: string;
}) => {
  const { t } = useTranslation();
  const [loadingTier, setLoadingTier] = useState<PurchasableTier | null>(null);
  const upgradeOptions = quotes?.upgrades ?? [];

  if (upgradeOptions.length === 0) {
    return null;
  }

  const remainingDays = getRemainingBillableDays(tierExpiresAt, serverTime);
  const title =
    currentTier === 'free'
      ? t('user.upgrade_purchase')
      : t('user.upgrade_title_with_expire', {
          date: formatExpireDate(tierExpiresAt, t),
          days: remainingDays ?? '-',
        });
  const hint =
    currentTier === 'free'
      ? t('user.upgrade_hint_free')
      : t('user.upgrade_hint_paid');

  const menuOptions: PurchaseMenuOption[] = upgradeOptions.map((option) => {
    const quote = option.quote;
    const proration = quote.proration;
    const tier = isPurchasableTier(option.tier) ? option.tier : undefined;
    const amountText =
      currentTier === 'free'
        ? `${t('user.annual_pay')} ${formatMoney(quote.amount)}`
        : proration
          ? t('user.upgrade_proration_text', {
              dailyAmount: formatMoney(proration.dailyAmount),
              days: proration.days,
              amount: formatMoney(proration.amount),
            })
          : t('user.order_settle');
    const disabled =
      quotesLoading || !tier || (currentTier !== 'free' && !proration);

    return {
      amountText,
      description:
        currentTier === 'free' ? t('user.purchase_after_pay') : undefined,
      details: tier ? getQuotaDetailItems(tier, t) : undefined,
      disabled,
      key: option.key,
      onClick: async () => {
        if (!tier) return;
        setLoadingTier(tier);
        try {
          await purchase(tier, option.months);
        } finally {
          setLoadingTier(null);
        }
      },
      title: tier ? getPurchasableTierLabel(tier, t) : option.key,
    };
  });

  return (
    <PurchaseActionPopover
      buttonLabel={loadingTier ? t('user.jumping') : t('user.upgrade_button')}
      hint={hint}
      loading={loadingTier !== null}
      title={title}
      widthClassName="w-[560px]"
      options={menuOptions}
    />
  );
};

function UserPanel() {
  const { t } = useTranslation();
  const { user, displayExpireDay, displayRemainingDays } = useUserInfo();
  const { apps } = useAppList();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const appList = apps ?? [];
  const versionCountQueries = useQueries({
    queries: appList.map((app) => ({
      queryKey: ['accountQuotaVersions', app.id],
      queryFn: () => api.getVersions({ appId: app.id, limit: 1 }),
      staleTime: 60_000,
    })),
  });
  const packageCountQueries = useQueries({
    queries: appList.map((app) => ({
      queryKey: ['accountQuotaPackages', app.id],
      queryFn: () => api.getPackages(app.id),
      staleTime: 60_000,
    })),
  });
  const orderQuotesQuery = useQuery({
    queryKey: [
      'orderQuotes',
      user?.tier,
      user?.tierExpiresAt,
      user?.quota?.pv,
      user?.quota?.price,
      user?.quota?.monthlyRenewalPrice,
      user?.quota?.checkUpdateAddonUnits,
    ],
    queryFn: () => api.getOrderQuotes(),
    enabled: !!user,
    retry: false,
    staleTime: 30_000,
  });

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  const { name, email, tier, quota } = user;
  const defaultQuota = quotas[tier as keyof typeof quotas];
  const currentQuota = quota || defaultQuota;

  const tierDisplay = currentQuota.title;
  const appCount = appList.length;
  const versionCounts = versionCountQueries.map((query) => query.data?.count);
  const isVersionCountLoading = versionCountQueries.some(
    (query) => query.isLoading,
  );
  const packageCounts = packageCountQueries.map(
    (query) => query.data?.count ?? query.data?.data?.length,
  );
  const isPackageCountLoading = packageCountQueries.some(
    (query) => query.isLoading,
  );
  const maxVersionCount = Math.max(
    0,
    ...versionCounts.map((count) => count ?? 0),
  );
  const maxPackageCount = Math.max(
    0,
    ...packageCounts.map((count) => count ?? 0),
  );
  const remainingChecks = user.checkQuota;
  const quotaUsageRows: QuotaUsageRow[] = [
    {
      key: 'app',
      label: t('user.app_count_label'),
      limit: currentQuota.app,
      note: t('user.app_count_note'),
      percent: Math.min(100, (appCount / currentQuota.app) * 100),
      status: appCount > currentQuota.app ? 'exception' : 'normal',
      value: `${appCount.toLocaleString()} / ${currentQuota.app.toLocaleString()} ${t('user.count_unit')}`,
    },
    {
      key: 'bundle',
      label: t('user.hotfix_count_label'),
      limit: currentQuota.bundle,
      loading: isVersionCountLoading,
      note: isVersionCountLoading
        ? t('user.counting_hotfix')
        : t('user.max_single_app'),
      percent: isVersionCountLoading
        ? 0
        : Math.min(100, (maxVersionCount / currentQuota.bundle) * 100),
      status: maxVersionCount > currentQuota.bundle ? 'exception' : 'normal',
      value: isVersionCountLoading
        ? t('user.counting')
        : `${maxVersionCount.toLocaleString()} / ${currentQuota.bundle.toLocaleString()} ${t('user.count_unit')}`,
    },
    {
      key: 'package',
      label: t('user.native_pkg_count_label'),
      limit: currentQuota.package,
      loading: isPackageCountLoading,
      note: isPackageCountLoading
        ? t('user.counting_native')
        : t('user.max_single_app'),
      percent: isPackageCountLoading
        ? 0
        : Math.min(100, (maxPackageCount / currentQuota.package) * 100),
      status: maxPackageCount > currentQuota.package ? 'exception' : 'normal',
      value: isPackageCountLoading
        ? t('user.counting')
        : `${maxPackageCount.toLocaleString()} / ${currentQuota.package.toLocaleString()} ${t('user.count_unit')}`,
    },
  ];
  const quotaSizeLimits = [
    {
      label: t('user.single_native_size'),
      value: currentQuota.packageSize,
    },
    {
      label: t('user.single_hotfix_size'),
      value: currentQuota.bundleSize,
    },
    {
      label: t('user.check_quota_limit'),
      value: `${currentQuota.pv.toLocaleString()} ${t('user.per_day')}`,
    },
  ];
  const handleLogout = () => {
    message.info(t('user.logged_out'));
    logout();
  };

  return (
    <div className="body">
      <Descriptions
        title={t('user.account_info')}
        column={1}
        layout={isMobile ? 'vertical' : 'horizontal'}
        size={isMobile ? 'small' : undefined}
        styles={{
          content: { wordBreak: 'break-word' },
          label: isMobile ? undefined : { width: 134 },
        }}
        bordered
      >
        <Descriptions.Item label={t('user.username')}>{name}</Descriptions.Item>
        <Descriptions.Item label={t('user.email')}>
          <span className="break-all">{email}</span>
        </Descriptions.Item>
        <Descriptions.Item label={t('user.service_version')}>
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(160px,180px)_160px] sm:items-center">
            <span className="shrink-0 whitespace-nowrap">{tierDisplay}</span>
            {!quota && defaultQuota && (
              <UpgradePurchaseControls
                currentTier={tier}
                quotes={orderQuotesQuery.data}
                quotesLoading={orderQuotesQuery.isLoading}
                serverTime={user.serverTime}
                tierExpiresAt={user.tierExpiresAt}
              />
            )}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label={t('user.service_expire')}>
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(160px,180px)_160px] sm:items-start">
            <div>
              {displayExpireDay ? (
                <>
                  <div>{displayExpireDay}</div>
                  {displayRemainingDays && (
                    <div className="mt-1 text-gray-500 text-sm">
                      {displayRemainingDays}
                    </div>
                  )}
                </>
              ) : (
                <div>{t('user.no_expire')}</div>
              )}
            </div>
            <RenewalPurchaseButton
              quotes={orderQuotesQuery.data}
              quotesLoading={orderQuotesQuery.isLoading}
              serverTime={user.serverTime}
              tier={tier}
              tierExpiresAt={user.tierExpiresAt}
            />
          </div>
        </Descriptions.Item>
        <Descriptions.Item label={t('user.purchase_note')}>
          <div className="text-sm text-gray-500">
            {t('user.purchasing_note')}
            <div className="mt-2">
              <Popover content={getInvoiceHint(t)} trigger="click">
                <a className="font-semibold">{t('user.view_invoice')}</a>
              </Popover>
            </div>
          </div>
        </Descriptions.Item>
        <Descriptions.Item label={t('user.quota_details')}>
          <QuotaDetailsPanel
            dailyQuota={currentQuota.pv}
            last7dAvg={user.last7dAvg}
            last7dCounts={user.last7dCounts}
            quota={quota}
            remainingChecks={remainingChecks}
            rows={quotaUsageRows}
            quotes={orderQuotesQuery.data}
            quotesLoading={orderQuotesQuery.isLoading}
            sizeLimits={quotaSizeLimits}
            tier={tier}
            tierExpiresAt={user.tierExpiresAt}
          />
        </Descriptions.Item>
      </Descriptions>
      <br />
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Button
          href={PRICING_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full md:w-auto"
        >
          {t('user.view_pricing')}
        </Button>
        <Button
          type="primary"
          className="w-full md:w-auto"
          href="https://pushy.reactnative.cn/docs/faq.html#%E5%8F%AF%E4%BB%A5%E4%BD%BF%E7%94%A8%E9%93%B6%E8%A1%8C%E8%BD%AC%E8%B4%A6%E4%BB%98%E6%AC%BE%E5%90%97"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('user.bank_transfer')}
        </Button>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="w-full md:w-auto"
        >
          {t('user.logout')}
        </Button>
      </div>
    </div>
  );
}

type QuotaUsageRow = {
  key: string;
  label: string;
  limit: number;
  loading?: boolean;
  note: string;
  percent: number;
  status: 'exception' | 'normal';
  value: string;
};

function QuotaDetailsPanel({
  dailyQuota,
  last7dAvg,
  last7dCounts,
  quota,
  quotes,
  quotesLoading,
  remainingChecks,
  rows,
  sizeLimits,
  tier,
  tierExpiresAt,
}: {
  dailyQuota: number;
  last7dAvg?: number;
  last7dCounts?: number[];
  quota?: Quota;
  quotes?: OrderQuotes;
  quotesLoading: boolean;
  remainingChecks?: number;
  rows: QuotaUsageRow[];
  sizeLimits: Array<{ label: string; value: string }>;
  tier: Tier;
  tierExpiresAt?: string;
}) {
  const { t } = useTranslation();
  const billingConfig = useOrderBillingConfig();
  const addonQuota = billingConfig.checkUpdateAddon?.quota ?? 100_000;
  const baseTier =
    quota?.base && quota.base in quotas
      ? quota.base
      : tier !== 'custom' && tier in quotas
        ? (tier as keyof typeof quotas)
        : undefined;
  const packageQuota = baseTier ? quotas[baseTier].pv : dailyQuota;
  const packageIncludedQuota = Math.min(dailyQuota, packageQuota);
  const packageExtraQuota = Math.max(0, dailyQuota - packageIncludedQuota);
  const quotaWarning = getCheckQuotaWarningState({
    dailyQuota,
    remaining: remainingChecks,
  });
  const remainingPercent = quotaWarning.percent;
  const status = quotaWarning.progressStatus;
  const displayRemaining =
    typeof remainingChecks === 'number' ? remainingChecks : dailyQuota;
  const panelClassName = quotaWarning.isExceeded
    ? 'border-red-300 shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
    : quotaWarning.isLow
      ? 'border-amber-300 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]'
      : 'border-slate-200';
  const headerClassName = quotaWarning.isExceeded
    ? 'border-red-100 bg-red-50'
    : quotaWarning.isLow
      ? 'border-amber-100 bg-amber-50'
      : 'border-slate-100 bg-gradient-to-br from-slate-50 to-white';
  const remainingClassName = quotaWarning.isExceeded
    ? 'text-red-700'
    : quotaWarning.isLow
      ? 'text-amber-700'
      : 'text-slate-900';
  const warningTag =
    quotaWarning.isExceeded && displayRemaining < 0
      ? t('user.already_exceeded')
      : quotaWarning.isExceeded
        ? t('user.already_exhausted')
        : quotaWarning.isLow
          ? t('user.low')
          : undefined;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-white',
        panelClassName,
      )}
    >
      <div
        className={cn(
          'grid items-stretch gap-4 border-b p-4 lg:grid-cols-2',
          headerClassName,
        )}
      >
        <div className="flex min-h-[150px] flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              {quotaWarning.isWarning && (
                <WarningOutlined
                  className={cn(
                    'mt-0.5 shrink-0 text-lg',
                    quotaWarning.isExceeded
                      ? 'animate-pulse text-red-600'
                      : 'text-amber-500',
                  )}
                />
              )}
              <div>
                <div className="font-medium text-slate-900">
                  {t('user.daily_check_title')}
                </div>
                <div className="mt-0.5 text-slate-500 text-xs">
                  {t('user.daily_check_desc')}
                </div>
              </div>
            </div>
            {warningTag && (
              <Tag
                color={quotaWarning.isExceeded ? 'red' : 'orange'}
                className="m-0"
              >
                {warningTag}
              </Tag>
            )}
          </div>
          <div className="mt-4">
            <div>
              <div className="text-[11px] text-gray-500">
                {t('user.remaining_today')}
              </div>
              <div
                className={cn(
                  'mt-1 font-semibold text-2xl leading-none tabular-nums',
                  remainingClassName,
                )}
              >
                {displayRemaining.toLocaleString()}
              </div>
              <div className="mt-1 text-gray-500 text-xs">
                {t('user.quota_limit_info', {
                  dailyQuota: dailyQuota.toLocaleString(),
                  included: packageIncludedQuota.toLocaleString(),
                  extra: packageExtraQuota.toLocaleString(),
                })}
              </div>
              {quotaWarning.isExceeded && displayRemaining < 0 && (
                <div className="mt-1 font-medium text-red-600 text-xs">
                  {t('user.exceeded_by', {
                    count: Math.abs(displayRemaining).toLocaleString(),
                  })}
                </div>
              )}
              {quotaWarning.isLow && (
                <div className="mt-1 font-medium text-amber-700 text-xs">
                  {t('user.low_below', {
                    percent: Math.round(CHECK_QUOTA_LOW_RATIO * 100),
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="mt-5">
            <Progress
              className="mb-0"
              percent={remainingPercent}
              showInfo={false}
              size="small"
              status={status}
              strokeColor={
                quotaWarning.isExceeded
                  ? '#ef4444'
                  : quotaWarning.isLow
                    ? '#f59e0b'
                    : undefined
              }
              trailColor={
                quotaWarning.isExceeded
                  ? '#fecaca'
                  : quotaWarning.isLow
                    ? '#fde68a'
                    : undefined
              }
            />
          </div>
          <CheckUpdateAddonPurchase
            addonQuota={addonQuota}
            billingConfig={billingConfig}
            dailyQuota={dailyQuota}
            quota={quota}
            quotes={quotes}
            quotesLoading={quotesLoading}
            tier={tier}
            tierExpiresAt={tierExpiresAt}
          />
        </div>
        <MiniQuotaBars
          dailyQuota={dailyQuota}
          title={t('user.recent_7day_avg', {
            avg: formatOptionalNumber(last7dAvg),
            range: formatQuotaDateRangeLabel(),
          })}
          tooltipSuffix={t('user.count_suffix')}
          values={last7dCounts}
        />
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div
            className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(140px,0.9fr)_minmax(180px,1fr)_minmax(180px,1.2fr)] md:items-center"
            key={row.key}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{row.label}</span>
                {row.status === 'exception' && (
                  <Tag color="red">{t('user.over_quota')}</Tag>
                )}
              </div>
              <div className="mt-0.5 text-slate-500 text-xs">{row.note}</div>
            </div>
            <div className="font-semibold tabular-nums">{row.value}</div>
            <Progress
              percent={row.percent}
              showInfo={false}
              size="small"
              status={row.status}
            />
          </div>
        ))}
      </div>

      <div className="border-slate-100 border-t bg-slate-50/70 px-4 py-3">
        <div className="mb-2 font-medium text-slate-700 text-xs">
          {t('user.spec_limits')}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {sizeLimits.map((item) => (
            <div key={item.label}>
              <div className="text-[11px] text-slate-500">{item.label}</div>
              <div className="mt-0.5 font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckUpdateAddonPurchase({
  addonQuota,
  billingConfig,
  dailyQuota,
  quota,
  quotes,
  quotesLoading,
  tier,
  tierExpiresAt,
}: {
  addonQuota: number;
  billingConfig: ReturnType<typeof useOrderBillingConfig>;
  dailyQuota: number;
  quota?: Quota;
  quotes?: OrderQuotes;
  quotesLoading: boolean;
  tier: Tier;
  tierExpiresAt?: string;
}) {
  const { t } = useTranslation();
  const [loadingUnits, setLoadingUnits] = useState<number | null>(null);
  const monthlyUnitPrice =
    billingConfig.checkUpdateAddon?.monthlyUnitPrice ?? 100;
  const eligibilityHint =
    billingConfig.checkUpdateAddon?.eligibilityMessage ??
    getDefaultCheckUpdateAddonEligibilityHint(t);
  const isExistingPaidService = tier !== 'free' && !!tierExpiresAt;
  const canPurchaseAddon = canPurchaseCheckUpdateAddon({
    dailyQuota,
    quota,
    tier,
    tierExpiresAt,
  });
  const menuOptions: PurchaseMenuOption[] = quotes?.checkUpdateAddons.length
    ? quotes.checkUpdateAddons.map((option) => {
        const units = option.checkUpdateAddonUnits ?? Number(option.key);
        const quote = option.quote;
        const proration = quote.proration;
        const disabled = quotesLoading || !quote;

        return {
          amountText: proration
            ? t('user.addon_proration_amount', {
                amount: formatMoney(proration.amount),
              })
            : `${formatMoney(quote.amount)} ${t('user.per_year')}`,
          disabled,
          key: option.key,
          onClick: async () => {
            setLoadingUnits(units);
            try {
              await purchaseCheckUpdateAddon(units);
            } finally {
              setLoadingUnits(null);
            }
          },
          title: `+${(addonQuota * units).toLocaleString()} ${t('user.per_day')}`,
        };
      })
    : [
        {
          amountText: quotesLoading
            ? t('user.quoting')
            : t('user.order_settle'),
          description: quotesLoading
            ? t('user.fetching_addon_quote')
            : undefined,
          disabled: true,
          key: 'unavailable',
          title: t('user.check_quota_addon'),
        },
      ];

  return (
    <div className="mt-4 flex flex-col gap-3 border-slate-200 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium text-slate-900 text-sm">
          {t('user.check_quota_addon')}
        </div>
        <div className="mt-0.5 text-slate-500 text-xs">
          {canPurchaseAddon
            ? t('user.addon_price_desc', {
                quota: addonQuota.toLocaleString(),
                price: formatMoney(monthlyUnitPrice),
              })
            : eligibilityHint}
        </div>
      </div>
      {canPurchaseAddon ? (
        <PurchaseActionPopover
          buttonLabel={
            loadingUnits ? t('user.jumping') : t('user.check_quota_addon')
          }
          hint={
            isExistingPaidService
              ? t('user.addon_proration_hint', {
                  quota: formatWan(addonQuota, t),
                  price: formatMoney(monthlyUnitPrice),
                })
              : t('user.addon_purchase_hint', {
                  quota: formatWan(addonQuota, t),
                  price: formatMoney(monthlyUnitPrice),
                })
          }
          loading={loadingUnits !== null}
          title={
            isExistingPaidService
              ? t('user.addon_title_with_expire', {
                  date: formatExpireDate(tierExpiresAt, t),
                })
              : t('user.addon_title')
          }
          options={menuOptions}
        />
      ) : (
        <Tooltip title={eligibilityHint}>
          <span>
            <Button className={purchaseButtonClassName} disabled>
              {t('user.check_quota_addon')}
            </Button>
          </span>
        </Tooltip>
      )}
    </div>
  );
}

function MiniQuotaBars({
  dailyQuota,
  title,
  tooltipSuffix,
  values,
}: {
  dailyQuota: number;
  title: string;
  tooltipSuffix: string;
  values?: number[];
}) {
  const { t } = useTranslation();
  const bars = (values ?? [])
    .slice(0, 7)
    .reverse()
    .map((value, index, array) => {
      const daysAgo = array.length - index - 1;
      return {
        daysAgo,
        dateLabel: formatQuotaDateLabel(daysAgo),
        value,
      };
    });

  return (
    <div className="flex h-full min-h-[150px] flex-col rounded-lg border border-slate-200/70 bg-white/70 p-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
        <span>{title}</span>
      </div>
      {bars.length > 0 ? (
        <div className="mt-2 flex flex-1 items-end gap-1.5">
          {bars.map((bar) => {
            const quotaWarning = getCheckQuotaWarningState({
              dailyQuota,
              remaining: bar.value,
            });
            const percent =
              dailyQuota > 0
                ? Math.max(
                    bar.value <= 0 ? 6 : 4,
                    Math.min(100, (Math.max(0, bar.value) / dailyQuota) * 100),
                  )
                : 0;
            const barClassName = quotaWarning.isExceeded
              ? 'bg-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.24)] hover:bg-red-600'
              : quotaWarning.isLow
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-blue-500 hover:bg-blue-600';
            return (
              <div
                className="flex h-full min-w-0 flex-1 flex-col items-center"
                key={`${bar.daysAgo}-days-ago`}
              >
                <div className="flex min-h-0 w-full flex-1 items-end rounded bg-slate-100">
                  <Tooltip
                    title={`${bar.dateLabel}：${bar.value.toLocaleString()} ${tooltipSuffix}`}
                  >
                    <div
                      className={cn(
                        'w-full rounded transition-colors',
                        barClassName,
                      )}
                      style={{ height: `${percent}%` }}
                    />
                  </Tooltip>
                </div>
                <span className="mt-1 text-[10px] text-gray-400 tabular-nums">
                  {bar.dateLabel}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 flex flex-1 items-center justify-center rounded bg-white text-gray-400 text-xs">
          {t('user.no_7day_details')}
        </div>
      )}
    </div>
  );
}

function formatOptionalNumber(value?: number) {
  return typeof value === 'number' ? value.toLocaleString() : '-';
}

function formatQuotaDateLabel(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatShortQuotaDate(date);
}

function formatQuotaDateRangeLabel() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return `${formatShortQuotaDate(start)} - ${formatShortQuotaDate(end)}`;
}

function formatShortQuotaDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

async function purchase(tier: keyof typeof products, months?: number) {
  const orderResponse = await api.createOrder({ months, tier });
  if (orderResponse?.payUrl && isValidExternalUrl(orderResponse.payUrl)) {
    window.location.href = orderResponse.payUrl;
  } else if (orderResponse?.payUrl) {
    console.error('Invalid payment URL:', orderResponse.payUrl);
    message.error(i18n.t('user.payment_invalid'));
  }
}

async function purchaseCheckUpdateAddon(units: number) {
  const orderResponse = await api.createOrder({ checkUpdateAddonUnits: units });
  if (orderResponse?.payUrl && isValidExternalUrl(orderResponse.payUrl)) {
    window.location.href = orderResponse.payUrl;
  } else if (orderResponse?.payUrl) {
    console.error('Invalid payment URL:', orderResponse.payUrl);
    message.error(i18n.t('user.payment_invalid'));
  }
}

export const Component = UserPanel;
