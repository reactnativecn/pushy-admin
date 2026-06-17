import {
  AlipayCircleOutlined,
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
  Select,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { logout } from '@/services/auth';
import {
  ANNUAL_BILLING_MONTHS,
  type BillingOption,
  DEFAULT_MONTHLY_PRICE_FACTOR,
  getAnnualSavings,
  getBillingOptions,
  resolveBillingPlan,
  resolveMonthlyPriceFactor,
  resolveProratedUpgradeAmount,
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

function formatBillingOptionText(option: BillingOption, showAmount = true) {
  const amount = showAmount ? `，${formatMoney(option.amount)}` : '';
  if (option.billingCycle === 'year') {
    return `年付（${option.billingMonths}个月${amount}）`;
  }
  return `${option.billingMonths}个月${showAmount ? `（${formatMoney(option.amount)}）` : ''}`;
}

function getConfiguredProductPrice(
  tier: keyof typeof products,
  billingConfig: ReturnType<typeof useOrderBillingConfig>,
) {
  return billingConfig.productPrices[tier] ?? products[tier].price;
}

function BillingOptionLabel({
  option,
  showAmount,
}: {
  option: BillingOption;
  showAmount: boolean;
}) {
  const savings = getAnnualSavings(option);

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
      <span>{formatBillingOptionText(option, showAmount)}</span>
      {savings.discount > 0 && (
        <Tag color="gold" className="m-0">
          约{formatDiscount(savings.discount)}折优惠
        </Tag>
      )}
    </span>
  );
}

function BillingMonthsSelect({
  disabled,
  onChange,
  showAmount = true,
  tier,
  value,
}: {
  disabled?: boolean;
  onChange: (months: number) => void;
  showAmount?: boolean;
  tier: keyof typeof products;
  value: number;
}) {
  const billingConfig = useOrderBillingConfig();
  const annualPrice = getConfiguredProductPrice(tier, billingConfig);
  const options =
    annualPrice > 0
      ? getBillingOptions({
          annualBillingMonths: billingConfig.annualBillingMonths,
          annualPrice,
          monthlyPriceFactor: billingConfig.monthlyPriceFactor,
        })
      : [];
  const fallbackValue =
    options.find((option) => option.billingCycle === 'year')?.value ??
    billingConfig.annualBillingMonths;
  const selectedValue = options.some((option) => option.value === value)
    ? value
    : fallbackValue;
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );
  const selectedSavings = selectedOption
    ? getAnnualSavings(selectedOption)
    : { amount: 0, percent: 0, discount: 0 };

  useEffect(() => {
    if (selectedValue !== value) {
      onChange(selectedValue);
    }
  }, [onChange, selectedValue, value]);

  if (options.length <= 1) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-1 sm:w-72">
      <Select
        aria-label="选择付费周期"
        className="w-full"
        disabled={disabled}
        onChange={onChange}
        options={options.map((option) => ({
          label: <BillingOptionLabel option={option} showAmount={showAmount} />,
          value: option.value,
        }))}
        value={selectedValue}
      />
      {selectedSavings.discount > 0 && (
        <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
          {`年付比按月购买节省 ${formatMoney(selectedSavings.amount)}，约${formatDiscount(selectedSavings.discount)}折优惠`}
        </div>
      )}
    </div>
  );
}

const PurchaseButton = ({ tier }: { tier: ProductTier }) => {
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(ANNUAL_BILLING_MONTHS);
  const tierOptions = [
    {
      label: products[tier]?.title ?? tier,
      value: tier,
    },
  ];

  return (
    <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[minmax(160px,180px)_minmax(220px,288px)_auto] sm:items-start md:mt-0 md:ml-6">
      <Select
        aria-label="选择服务版本"
        className="w-full"
        disabled={loading}
        options={tierOptions}
        value={tier}
      />
      <BillingMonthsSelect
        disabled={loading}
        onChange={setMonths}
        tier={tier}
        value={months}
      />
      <Button
        className="w-full justify-center sm:w-auto"
        icon={<AlipayCircleOutlined />}
        loading={loading}
        onClick={async () => {
          if (tier === 'custom') {
            return message.error('定制版用户付费请联系客服');
          }
          setLoading(true);
          try {
            await purchase(tier, months);
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? '跳转至支付页面' : '购买'}
      </Button>
    </div>
  );
};

const UpgradePurchaseControls = ({
  currentQuota,
  currentTier,
  tierExpiresAt,
}: {
  currentQuota: (typeof quotas)[keyof typeof quotas];
  currentTier: Tier;
  tierExpiresAt?: string;
}) => {
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(ANNUAL_BILLING_MONTHS);
  const billingConfig = useOrderBillingConfig();

  const upgradeOptions = purchasableTiers.filter(
    (option) => currentQuota.pv < quotas[option.tier].pv,
  );
  const [targetTier, setTargetTier] = useState<PurchasableTier | undefined>(
    upgradeOptions[0]?.tier,
  );

  if (upgradeOptions.length === 0) {
    return null; // 没有可升级的版本
  }

  const selectedTier = upgradeOptions.some(
    (option) => option.tier === targetTier,
  )
    ? targetTier
    : upgradeOptions[0]?.tier;

  const getUpgradePriceText = (tier: ProductTier) => {
    const targetAnnualPrice = getConfiguredProductPrice(tier, billingConfig);

    if (currentTier === 'free') {
      const plan = resolveBillingPlan(
        targetAnnualPrice,
        months,
        billingConfig.monthlyPriceFactor,
      );
      return formatMoney(plan.amount);
    }

    const currentAnnualPrice =
      currentTier in products
        ? getConfiguredProductPrice(
            currentTier as keyof typeof products,
            billingConfig,
          )
        : undefined;
    const amount = resolveProratedUpgradeAmount({
      currentAnnualPrice,
      expiresAt: tierExpiresAt,
      targetAnnualPrice,
    });

    return amount === null ? '按订单结算' : `补差价 ${formatMoney(amount)}`;
  };

  const handlePurchaseClick = async () => {
    if (!selectedTier) return;

    setLoading(true);
    try {
      await purchase(selectedTier, currentTier === 'free' ? months : undefined);
    } finally {
      setLoading(false);
    }
  };

  const targetTierOptions = upgradeOptions.map((option) => ({
    label: option.label,
    value: option.tier,
  }));
  const upgradePriceOption = selectedTier
    ? {
        label: getUpgradePriceText(selectedTier),
        value: selectedTier,
      }
    : undefined;

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[minmax(160px,180px)_minmax(220px,288px)_auto] sm:items-start">
      <Select
        aria-label="选择升级版本"
        className="w-full"
        disabled={loading}
        onChange={setTargetTier}
        options={targetTierOptions}
        value={selectedTier}
      />
      {currentTier === 'free' && selectedTier ? (
        <BillingMonthsSelect
          disabled={loading}
          onChange={setMonths}
          tier={selectedTier}
          value={months}
        />
      ) : (
        <Select
          aria-label="选择付款金额"
          className="w-full"
          disabled={loading}
          options={upgradePriceOption ? [upgradePriceOption] : []}
          value={upgradePriceOption?.value}
        />
      )}
      <Button
        className="w-full justify-center sm:w-auto"
        icon={<AlipayCircleOutlined />}
        loading={loading}
        onClick={handlePurchaseClick}
      >
        {loading ? '跳转至支付页面' : '购买'}
      </Button>
    </div>
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
          <div className="flex items-center gap-4">
            <span className="shrink-0 whitespace-nowrap">{tierDisplay}</span>
            {!quota && defaultQuota && (
              <UpgradePurchaseControls
                currentQuota={defaultQuota}
                currentTier={tier}
                tierExpiresAt={user.tierExpiresAt}
              />
            )}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="服务有效期至">
          <div className="flex min-w-0 flex-col gap-1">
            {displayExpireDay ? (
              <>
                <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
                  <span>{displayExpireDay}</span>
                  {tier !== 'free' && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <PurchaseButton tier={tier} />
                    </div>
                  )}
                </div>
                {displayRemainingDays && <div>{displayRemainingDays}</div>}
              </>
            ) : (
              <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
                <span>无</span>
                {tier !== 'free' && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <PurchaseButton tier={tier} />
                  </div>
                )}
              </div>
            )}
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
            remainingChecks={remainingChecks}
            rows={quotaUsageRows}
            sizeLimits={quotaSizeLimits}
          />
          <div className="h-px my-4 w-full max-w-md bg-gray-300" />
          <div className="text-xm text-gray-500">
            如有定制需求（限高级版以上），请联系 QQ 客服 34731408
          </div>
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
  remainingChecks,
  rows,
  sizeLimits,
}: {
  dailyQuota: number;
  last7dAvg?: number;
  last7dCounts?: number[];
  remainingChecks?: number;
  rows: QuotaUsageRow[];
  sizeLimits: Array<{ label: string; value: string }>;
}) {
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
                上限 {dailyQuota.toLocaleString()} 次 / 日
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

export const Component = UserPanel;
