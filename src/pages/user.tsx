import { AlipayCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import type { MenuProps } from 'antd';
import {
  Button,
  Descriptions,
  Dropdown,
  Grid,
  message,
  Popover,
  Progress,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import { type ReactNode, useState } from 'react';
import { api } from '@/services/api';
import { logout } from '@/services/auth';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { PRICING_LINK } from '../constants/links';
import { quotas } from '../constants/quotas';

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

const PurchaseButton = ({
  tier,
  children,
}: {
  tier: string;
  children: ReactNode;
}) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      // type='link'
      className="mt-2 w-full justify-center sm:w-auto md:mt-0 md:ml-6"
      icon={<AlipayCircleOutlined />}
      onClick={async () => {
        if (tier === 'custom') {
          return message.error('定制版用户付费请联系客服');
        }
        setLoading(true);
        await purchase(tier);
      }}
      loading={loading}
    >
      {loading ? '跳转至支付页面' : children}
    </Button>
  );
};

const UpgradeDropdown = ({
  currentQuota,
}: {
  currentQuota: (typeof quotas)[keyof typeof quotas];
}) => {
  const [loading, setLoading] = useState(false);

  // 获取所有可升级的版本
  const getUpgradeOptions = () => {
    const allTiers = [
      { key: 'standard', title: '升级标准版', tier: 'standard' },
      { key: 'premium', title: '升级高级版', tier: 'premium' },
      { key: 'pro', title: '升级专业版', tier: 'pro' },
      { key: 'vip1', title: '升级大客户VIP1版', tier: 'vip1' },
      { key: 'vip2', title: '升级大客户VIP2版', tier: 'vip2' },
      { key: 'vip3', title: '升级大客户VIP3版', tier: 'vip3' },
    ];

    return allTiers.filter(
      (option) =>
        currentQuota.pv < quotas[option.tier as keyof typeof quotas].pv,
    );
  };

  const upgradeOptions = getUpgradeOptions();

  if (upgradeOptions.length === 0) {
    return null; // 没有可升级的版本
  }

  const handleMenuClick: MenuProps['onClick'] = async ({ key }) => {
    setLoading(true);
    await purchase(key);
  };

  const menuItems: MenuProps['items'] = upgradeOptions.map((option) => ({
    key: option.tier,
    label: option.title,
    icon: <AlipayCircleOutlined />,
  }));

  const handleMainButtonClick = async () => {
    // 点击主按钮时，选择第一个可升级的版本
    if (upgradeOptions.length > 0) {
      setLoading(true);
      await purchase(upgradeOptions[0].tier);
    }
  };

  return (
    <Dropdown.Button
      className="shrink-0"
      icon={<AlipayCircleOutlined />}
      loading={loading}
      menu={{
        items: menuItems,
        onClick: handleMenuClick,
      }}
      onClick={handleMainButtonClick}
    >
      {loading ? '跳转至支付页面' : upgradeOptions[0]?.title || '升级服务'}
    </Dropdown.Button>
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
              <UpgradeDropdown currentQuota={defaultQuota} />
            )}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="服务有效期至">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {displayExpireDay ? (
              <div className="flex min-w-0 flex-col">
                {displayExpireDay}
                {displayRemainingDays && (
                  <>
                    <br />
                    <div>{displayRemainingDays}</div>
                  </>
                )}
              </div>
            ) : (
              '无'
            )}
            {tier !== 'free' && (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <PurchaseButton tier={tier}>续费</PurchaseButton>
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
  const remainingPercent =
    typeof remainingChecks === 'number'
      ? Math.max(0, Math.min(100, (remainingChecks / dailyQuota) * 100))
      : 0;
  const status =
    remainingChecks !== undefined && remainingChecks <= 0
      ? 'exception'
      : 'normal';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid items-stretch gap-4 border-slate-100 border-b bg-gradient-to-br from-slate-50 to-white p-4 lg:grid-cols-2">
        <div className="flex min-h-[150px] flex-col">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-slate-900">每日检查额度</div>
              <div className="mt-0.5 text-slate-500 text-xs">
                客户端检查热更新时消耗，按账户全部应用汇总。
              </div>
            </div>
            {status === 'exception' && <Tag color="red">超额</Tag>}
          </div>
          <div className="mt-4">
            <div>
              <div className="text-[11px] text-gray-500">今日剩余额度</div>
              <div className="mt-1 font-semibold text-2xl leading-none tabular-nums">
                {remainingChecks === undefined
                  ? dailyQuota.toLocaleString()
                  : Math.max(0, remainingChecks).toLocaleString()}
              </div>
              <div className="mt-1 text-gray-500 text-xs">
                上限 {dailyQuota.toLocaleString()} 次 / 日
              </div>
            </div>
          </div>
          <div className="mt-5">
            <Progress
              className="mb-0"
              percent={remainingPercent}
              showInfo={false}
              size="small"
              status={status}
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
            const percent =
              dailyQuota > 0
                ? Math.max(
                    bar.value > 0 ? 4 : 0,
                    Math.min(100, (Math.max(0, bar.value) / dailyQuota) * 100),
                  )
                : 0;
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
                      className="w-full rounded bg-blue-500 transition-colors hover:bg-blue-600"
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
  return typeof value === 'number' ? Math.max(0, value).toLocaleString() : '-';
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

async function purchase(tier?: string) {
  const orderResponse = await api.createOrder({ tier });
  if (orderResponse?.payUrl) {
    window.location.href = orderResponse.payUrl;
  }
}

export const Component = UserPanel;
