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
import { api } from '@/services/api';
import { logout } from '@/services/auth';
import {
  ANNUAL_BILLING_MONTHS,
  DEFAULT_MONTHLY_PRICE_FACTOR,
  resolveBillingPlan,
  resolveMonthlyPriceFactor,
  resolveProratedAdditiveAmount,
} from '@/utils/billing';
import {
  CHECK_QUOTA_LOW_RATIO,
  getCheckQuotaWarningState,
} from '@/utils/check-quota-warning';
import { cn, isValidExternalUrl } from '@/utils/helper';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { PRICING_LINK } from '../constants/links';
import { products, quotas } from '../constants/quotas';

type ProductTier = keyof typeof products;
type PurchasableTier = Exclude<ProductTier, 'free' | 'custom'>;

const purchasableTiers: Array<{
  label: string;
  tier: PurchasableTier;
}> = [
  { label: '标准版', tier: 'standard' },
  { label: '高级版', tier: 'premium' },
  { label: '专业版', tier: 'pro' },
  { label: '大客户VIP1版', tier: 'vip1' },
  { label: '大客户VIP2版', tier: 'vip2' },
  { label: '大客户VIP3版', tier: 'vip3' },
];
const purchaseButtonClassName = 'w-full justify-center sm:w-[160px]';

const InvoiceHint = (
  <div>
    <p>
      请发送邮件至 <a href="mailto:hi@charmlot.com">hi@charmlot.com</a>
      ，并写明：
    </p>
    <p>
      <strong>
        公司名称、税号、注册邮箱、接收发票邮箱（不写则发送到注册邮箱），附带支付截图。
      </strong>
    </p>
    <p>
      我们默认会回复普通电子发票到接收邮箱(请同时留意垃圾邮件)，类目为软件服务。
    </p>
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
  const productPrices = Object.fromEntries(
    data?.tiers?.map((tier) => [tier.key, tier.annualPrice]) ?? [],
  ) as Partial<Record<keyof typeof products, number>>;

  return {
    annualBillingMonths: data?.annualBillingMonths ?? ANNUAL_BILLING_MONTHS,
    checkUpdateAddon: data?.checkUpdateAddon,
    monthlyPriceFactor: resolveMonthlyPriceFactor(
      data?.monthlyPriceFactor ?? DEFAULT_MONTHLY_PRICE_FACTOR,
    ),
    productPrices,
  };
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `￥${value}` : `￥${value.toFixed(2)}`;
}

function formatDiscount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getConfiguredProductPrice(
  tier: keyof typeof products,
  billingConfig: ReturnType<typeof useOrderBillingConfig>,
) {
  return billingConfig.productPrices[tier] ?? products[tier].price;
}

function roundMoneyValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getRemainingBillableDays(expiresAt?: string, now?: string) {
  if (!expiresAt) {
    return null;
  }
  const days = dayjs(expiresAt).add(1, 'day').diff(dayjs(now), 'day');
  return days > 0 ? days : null;
}

function formatExpireDate(expiresAt?: string) {
  return expiresAt ? dayjs(expiresAt).format('YYYY年MM月DD日') : '当前到期日';
}

function formatRenewedExpireDate({
  expiresAt,
  months,
  now,
}: {
  expiresAt?: string;
  months: number;
  now?: string;
}) {
  const currentExpireDay = expiresAt ? dayjs(expiresAt) : null;
  const nowDay = dayjs(now);
  const baseDay = currentExpireDay?.isAfter(nowDay) ? currentExpireDay : nowDay;
  return baseDay.add(months, 'month').format('YYYY年MM月DD日');
}

function getUpgradeProrationDetail({
  currentAnnualPrice,
  expiresAt,
  now,
  targetAnnualPrice,
}: {
  currentAnnualPrice?: number;
  expiresAt?: string;
  now?: string;
  targetAnnualPrice: number;
}) {
  if (
    !currentAnnualPrice ||
    currentAnnualPrice <= 0 ||
    currentAnnualPrice >= targetAnnualPrice
  ) {
    return null;
  }
  const days = getRemainingBillableDays(expiresAt, now);
  if (!days) {
    return null;
  }
  const annualDelta = roundMoneyValue(targetAnnualPrice - currentAnnualPrice);
  const amount = roundMoneyValue((annualDelta / 365) * days);
  const dailyAmount = roundMoneyValue(annualDelta / 365);

  return {
    amount,
    dailyAmount,
    days,
  };
}

function getAdditiveProrationDetail({
  annualAmount,
  expiresAt,
  now,
}: {
  annualAmount: number;
  expiresAt?: string;
  now?: string;
}) {
  const amount = resolveProratedAdditiveAmount({
    annualAmount,
    expiresAt,
    now,
  });
  const days = getRemainingBillableDays(expiresAt, now);
  if (amount === null || !days) {
    return null;
  }
  const roundedAnnualAmount = roundMoneyValue(annualAmount);

  return {
    amount,
    annualAmount: roundedAnnualAmount,
    days,
    formula: `(${formatMoney(roundedAnnualAmount)} ÷ 365) × ${days} 天 = ${formatMoney(amount)}`,
  };
}

function formatWan(value: number) {
  return `${value / 10_000}万`;
}

function getQuotaDetailItems(tier: PurchasableTier) {
  const quota = quotas[tier];
  return [
    {
      label: '检查次数每日',
      value: formatWan(quota.pv),
    },
    {
      label: '应用个数',
      value: `${quota.app.toLocaleString()} 个`,
    },
    {
      label: '原生包数',
      value: `${quota.package.toLocaleString()} 个`,
    },
    {
      label: '热更包数',
      value: `${quota.bundle.toLocaleString()} 个`,
    },
  ];
}

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
  emptyText = '暂无可购买项目',
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
            {emptyText}
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

function getRenewalPrices({
  billingConfig,
  quota,
  tier,
}: {
  billingConfig: ReturnType<typeof useOrderBillingConfig>;
  quota?: Quota;
  tier: Tier;
}) {
  if (tier === 'free') {
    return null;
  }
  const annualPrice =
    tier === 'custom'
      ? quota?.price
      : tier in products
        ? getConfiguredProductPrice(tier as ProductTier, billingConfig)
        : undefined;
  if (!annualPrice || annualPrice <= 0) {
    return null;
  }

  const monthlyPlan = resolveBillingPlan(
    annualPrice,
    1,
    billingConfig.monthlyPriceFactor,
  );
  const monthlyPrice =
    tier === 'custom' && quota?.monthlyRenewalPrice
      ? quota.monthlyRenewalPrice
      : monthlyPlan.amount;

  return {
    annualPrice: roundMoneyValue(annualPrice),
    monthlyPrice: roundMoneyValue(monthlyPrice),
  };
}

const RenewalPurchaseButton = ({
  quota,
  serverTime,
  tier,
  tierExpiresAt,
}: {
  quota?: Quota;
  serverTime?: string;
  tier: Tier;
  tierExpiresAt?: string;
}) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const billingConfig = useOrderBillingConfig();
  const prices = getRenewalPrices({ billingConfig, quota, tier });
  const addonUnits =
    typeof quota?.checkUpdateAddonUnits === 'number' &&
    quota.checkUpdateAddonUnits > 0
      ? quota.checkUpdateAddonUnits
      : 0;
  const addonMonthlyPrice = roundMoneyValue(
    addonUnits * (billingConfig.checkUpdateAddon?.monthlyUnitPrice ?? 100),
  );

  if (tier === 'free') {
    return null;
  }

  const renewalOptions: PurchaseMenuOption[] = prices
    ? (() => {
        const options: PurchaseMenuOption[] = [];
        for (
          let months = 1;
          months < billingConfig.annualBillingMonths;
          months += 1
        ) {
          const amount = roundMoneyValue(prices.monthlyPrice * months);
          if (amount >= prices.annualPrice) {
            break;
          }
          options.push({
            amountText: formatMoney(amount),
            description: `续费后到期日 ${formatRenewedExpireDate({
              expiresAt: tierExpiresAt,
              months,
              now: serverTime,
            })}`,
            key: `month-${months}`,
            onClick: async () => {
              setLoadingPlan(`month-${months}`);
              try {
                await purchase(tier, months);
              } finally {
                setLoadingPlan(null);
              }
            },
            title: `${months} 个月`,
          });
        }

        options.push({
          amountText: formatMoney(prices.annualPrice),
          description: `续费后到期日 ${formatRenewedExpireDate({
            expiresAt: tierExpiresAt,
            months: billingConfig.annualBillingMonths,
            now: serverTime,
          })}`,
          key: 'year',
          onClick: async () => {
            setLoadingPlan('year');
            try {
              await purchase(tier, billingConfig.annualBillingMonths);
            } finally {
              setLoadingPlan(null);
            }
          },
          tag:
            prices.monthlyPrice * billingConfig.annualBillingMonths >
            prices.annualPrice
              ? `约${formatDiscount(
                  roundMoneyValue(
                    (prices.annualPrice /
                      (prices.monthlyPrice *
                        billingConfig.annualBillingMonths)) *
                      10,
                  ),
                )}折优惠`
              : undefined,
          title: `${billingConfig.annualBillingMonths} 个月（年付）`,
        });

        return options;
      })()
    : [
        {
          amountText: '按订单结算',
          description: '当前版本暂未返回可续费价格',
          disabled: true,
          key: 'unavailable',
          title: '续费',
        },
      ];

  return (
    <PurchaseActionPopover
      buttonLabel={loadingPlan ? '跳转中' : '续费'}
      loading={loadingPlan !== null}
      title="续费"
      titleNote={
        addonUnits > 0
          ? `当前价格含加购费用每月 ${formatMoney(addonMonthlyPrice)}`
          : undefined
      }
      options={renewalOptions}
    />
  );
};

const UpgradePurchaseControls = ({
  currentQuota,
  currentTier,
  serverTime,
  tierExpiresAt,
}: {
  currentQuota: (typeof quotas)[keyof typeof quotas];
  currentTier: Tier;
  serverTime?: string;
  tierExpiresAt?: string;
}) => {
  const [loadingTier, setLoadingTier] = useState<PurchasableTier | null>(null);
  const billingConfig = useOrderBillingConfig();

  const upgradeOptions = purchasableTiers.filter(
    (option) => currentQuota.pv < quotas[option.tier].pv,
  );

  if (upgradeOptions.length === 0) {
    return null; // 没有可升级的版本
  }

  const currentAnnualPrice =
    currentTier in products
      ? getConfiguredProductPrice(
          currentTier as keyof typeof products,
          billingConfig,
        )
      : undefined;
  const remainingDays = getRemainingBillableDays(tierExpiresAt, serverTime);
  const title =
    currentTier === 'free'
      ? '升级购买'
      : `升级（有效期不变：至 ${formatExpireDate(tierExpiresAt)}，${remainingDays ?? '-'} 天）`;
  const hint =
    currentTier === 'free'
      ? '选择目标版本后按年付开通服务。'
      : '补差价按目标版本与当前版本的年费差额逐天折算。';

  const menuOptions: PurchaseMenuOption[] = upgradeOptions.map((option) => {
    const targetAnnualPrice = getConfiguredProductPrice(
      option.tier,
      billingConfig,
    );
    const annualPlan = resolveBillingPlan(
      targetAnnualPrice,
      billingConfig.annualBillingMonths,
      billingConfig.monthlyPriceFactor,
    );
    const proration =
      currentTier === 'free'
        ? null
        : getUpgradeProrationDetail({
            currentAnnualPrice,
            expiresAt: tierExpiresAt,
            now: serverTime,
            targetAnnualPrice,
          });
    const amountText =
      currentTier === 'free'
        ? `年付 ${formatMoney(annualPlan.amount)}`
        : proration
          ? `补差价 ${formatMoney(proration.dailyAmount)} × ${proration.days} 天 = ${formatMoney(proration.amount)}`
          : '按订单结算';
    const disabled = currentTier !== 'free' && !proration;

    return {
      amountText,
      description:
        currentTier === 'free' ? '购买后从支付日起开通服务' : undefined,
      details: getQuotaDetailItems(option.tier),
      disabled,
      key: option.tier,
      onClick: async () => {
        setLoadingTier(option.tier);
        try {
          await purchase(
            option.tier,
            currentTier === 'free'
              ? billingConfig.annualBillingMonths
              : undefined,
          );
        } finally {
          setLoadingTier(null);
        }
      },
      title: option.label,
    };
  });

  return (
    <PurchaseActionPopover
      buttonLabel={loadingTier ? '跳转中' : '升级'}
      hint={hint}
      loading={loadingTier !== null}
      title={title}
      widthClassName="w-[560px]"
      options={menuOptions}
    />
  );
};

function UserPanel() {
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
      label: '应用数量',
      limit: currentQuota.app,
      note: '当前账户下应用总数',
      percent: Math.min(100, (appCount / currentQuota.app) * 100),
      status: appCount > currentQuota.app ? 'exception' : 'normal',
      value: `${appCount.toLocaleString()} / ${currentQuota.app.toLocaleString()} 个`,
    },
    {
      key: 'bundle',
      label: '热更包数量',
      limit: currentQuota.bundle,
      loading: isVersionCountLoading,
      note: isVersionCountLoading
        ? '正在统计各应用热更包数量'
        : '最高单应用使用量',
      percent: isVersionCountLoading
        ? 0
        : Math.min(100, (maxVersionCount / currentQuota.bundle) * 100),
      status: maxVersionCount > currentQuota.bundle ? 'exception' : 'normal',
      value: isVersionCountLoading
        ? '统计中'
        : `${maxVersionCount.toLocaleString()} / ${currentQuota.bundle.toLocaleString()} 个`,
    },
    {
      key: 'package',
      label: '原生包数量',
      limit: currentQuota.package,
      loading: isPackageCountLoading,
      note: isPackageCountLoading
        ? '正在统计各应用原生包数量'
        : '最高单应用使用量',
      percent: isPackageCountLoading
        ? 0
        : Math.min(100, (maxPackageCount / currentQuota.package) * 100),
      status: maxPackageCount > currentQuota.package ? 'exception' : 'normal',
      value: isPackageCountLoading
        ? '统计中'
        : `${maxPackageCount.toLocaleString()} / ${currentQuota.package.toLocaleString()} 个`,
    },
  ];
  const quotaSizeLimits = [
    {
      label: '单个原生包大小',
      value: currentQuota.packageSize,
    },
    {
      label: '单个热更包大小',
      value: currentQuota.bundleSize,
    },
    {
      label: '检查额度上限',
      value: `${currentQuota.pv.toLocaleString()} 次 / 日`,
    },
  ];
  const handleLogout = () => {
    message.info('您已退出登录');
    logout();
  };

  return (
    <div className="body">
      <Descriptions
        title="账户信息"
        column={1}
        layout={isMobile ? 'vertical' : 'horizontal'}
        size={isMobile ? 'small' : undefined}
        styles={{
          content: { wordBreak: 'break-word' },
          label: isMobile ? undefined : { width: 134 },
        }}
        bordered
      >
        <Descriptions.Item label="用户名">{name}</Descriptions.Item>
        <Descriptions.Item label="邮箱">
          <span className="break-all">{email}</span>
        </Descriptions.Item>
        <Descriptions.Item label="服务版本">
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(160px,180px)_160px] sm:items-center">
            <span className="shrink-0 whitespace-nowrap">{tierDisplay}</span>
            {!quota && defaultQuota && (
              <UpgradePurchaseControls
                currentQuota={defaultQuota}
                currentTier={tier}
                serverTime={user.serverTime}
                tierExpiresAt={user.tierExpiresAt}
              />
            )}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="服务有效期至">
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
                <div>无</div>
              )}
            </div>
            <RenewalPurchaseButton
              quota={quota}
              serverTime={user.serverTime}
              tier={tier}
              tierExpiresAt={user.tierExpiresAt}
            />
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="购买说明">
          <div className="text-sm text-gray-500">
            只可续费相同服务版本或升级更高版本，如果您需要购买较低的服务版本，请等待当前版本过期，或联系
            QQ 客服 34731408 手动处理。
            <div className="mt-2">
              <Popover content={InvoiceHint} trigger="click">
                <a className="font-semibold">点此查看如何申请发票</a>
              </Popover>
            </div>
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="额度详情">
          <QuotaDetailsPanel
            dailyQuota={currentQuota.pv}
            last7dAvg={user.last7dAvg}
            last7dCounts={user.last7dCounts}
            quota={quota}
            remainingChecks={remainingChecks}
            rows={quotaUsageRows}
            serverTime={user.serverTime}
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
          查看价格表
        </Button>
        <Button
          type="primary"
          className="w-full md:w-auto"
          href="https://pushy.reactnative.cn/docs/faq.html#%E5%8F%AF%E4%BB%A5%E4%BD%BF%E7%94%A8%E9%93%B6%E8%A1%8C%E8%BD%AC%E8%B4%A6%E4%BB%98%E6%AC%BE%E5%90%97"
          target="_blank"
          rel="noopener noreferrer"
        >
          使用网银转账
        </Button>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="w-full md:w-auto"
        >
          退出登录
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
  remainingChecks,
  rows,
  serverTime,
  sizeLimits,
  tier,
  tierExpiresAt,
}: {
  dailyQuota: number;
  last7dAvg?: number;
  last7dCounts?: number[];
  quota?: Quota;
  remainingChecks?: number;
  rows: QuotaUsageRow[];
  serverTime?: string;
  sizeLimits: Array<{ label: string; value: string }>;
  tier: Tier;
  tierExpiresAt?: string;
}) {
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
      ? '已超额'
      : quotaWarning.isExceeded
        ? '已用尽'
        : quotaWarning.isLow
          ? '偏低'
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
                <div className="font-medium text-slate-900">每日检查额度</div>
                <div className="mt-0.5 text-slate-500 text-xs">
                  客户端检查热更新时消耗，按账户全部应用汇总。
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
              <div className="text-[11px] text-gray-500">今日剩余额度</div>
              <div
                className={cn(
                  'mt-1 font-semibold text-2xl leading-none tabular-nums',
                  remainingClassName,
                )}
              >
                {displayRemaining.toLocaleString()}
              </div>
              <div className="mt-1 text-gray-500 text-xs">
                上限 {dailyQuota.toLocaleString()} 次 / 日（套餐内{' '}
                {packageIncludedQuota.toLocaleString()} 次 + 加购{' '}
                {packageExtraQuota.toLocaleString()} 次）
              </div>
              {quotaWarning.isExceeded && displayRemaining < 0 && (
                <div className="mt-1 font-medium text-red-600 text-xs">
                  已超出 {Math.abs(displayRemaining).toLocaleString()} 次
                </div>
              )}
              {quotaWarning.isLow && (
                <div className="mt-1 font-medium text-amber-700 text-xs">
                  低于 {Math.round(CHECK_QUOTA_LOW_RATIO * 100)}
                  %，请留意检查频率
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
            serverTime={serverTime}
            tier={tier}
            tierExpiresAt={tierExpiresAt}
          />
        </div>
        <MiniQuotaBars
          dailyQuota={dailyQuota}
          title={`最近 7 天平均剩余额度 ${formatOptionalNumber(last7dAvg)}（${formatQuotaDateRangeLabel()}）`}
          tooltipSuffix="次"
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
                {row.status === 'exception' && <Tag color="red">超额</Tag>}
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
        <div className="mb-2 font-medium text-slate-700 text-xs">规格限制</div>
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
  serverTime,
  tier,
  tierExpiresAt,
}: {
  addonQuota: number;
  billingConfig: ReturnType<typeof useOrderBillingConfig>;
  serverTime?: string;
  tier: Tier;
  tierExpiresAt?: string;
}) {
  const [loadingUnits, setLoadingUnits] = useState<number | null>(null);
  const monthlyUnitPrice =
    billingConfig.checkUpdateAddon?.monthlyUnitPrice ?? 100;
  const annualUnitPrice =
    billingConfig.checkUpdateAddon?.annualPrice ??
    monthlyUnitPrice * ANNUAL_BILLING_MONTHS;
  const isExistingPaidService = tier !== 'free' && !!tierExpiresAt;
  const menuOptions: PurchaseMenuOption[] = Array.from(
    { length: 10 },
    (_, index) => {
      const units = index + 1;
      const annualAmount = annualUnitPrice * units;
      const proration = isExistingPaidService
        ? getAdditiveProrationDetail({
            annualAmount,
            expiresAt: tierExpiresAt,
            now: serverTime,
          })
        : null;
      const disabled = isExistingPaidService && !proration;

      return {
        amountText: proration
          ? `补差价 ${formatMoney(proration.amount)}`
          : disabled
            ? '请先续费套餐'
            : `${formatMoney(annualAmount)} / 年`,
        disabled,
        key: String(units),
        onClick: async () => {
          setLoadingUnits(units);
          try {
            await purchaseCheckUpdateAddon(units);
          } finally {
            setLoadingUnits(null);
          }
        },
        title: `+${(addonQuota * units).toLocaleString()} 次 / 日`,
      };
    },
  );

  return (
    <div className="mt-4 flex flex-col gap-3 border-slate-200 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium text-slate-900 text-sm">检查额度加购</div>
        <div className="mt-0.5 text-slate-500 text-xs">
          每增加 {addonQuota.toLocaleString()} 次 / 日，每月额外收费{' '}
          {formatMoney(monthlyUnitPrice)}。
        </div>
      </div>
      <PurchaseActionPopover
        buttonLabel={loadingUnits ? '跳转中' : '加购检查额度'}
        hint={
          isExistingPaidService
            ? `按剩余天数补差价。收费基准为：${formatWan(addonQuota)}次/日，每月加收 ${formatMoney(monthlyUnitPrice)}，可叠加购买。`
            : `收费基准为：${formatWan(addonQuota)}次/日，每月加收 ${formatMoney(monthlyUnitPrice)}，可叠加购买。`
        }
        loading={loadingUnits !== null}
        title={
          isExistingPaidService
            ? `加购检查额度（当前有效期不变：至 ${formatExpireDate(tierExpiresAt)}）`
            : '加购检查额度'
        }
        options={menuOptions}
      />
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
          暂无 7 天明细
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
    message.error('支付链接无效');
  }
}

async function purchaseCheckUpdateAddon(units: number) {
  const orderResponse = await api.createOrder({ checkUpdateAddonUnits: units });
  if (orderResponse?.payUrl && isValidExternalUrl(orderResponse.payUrl)) {
    window.location.href = orderResponse.payUrl;
  } else if (orderResponse?.payUrl) {
    console.error('Invalid payment URL:', orderResponse.payUrl);
    message.error('支付链接无效');
  }
}

export const Component = UserPanel;
