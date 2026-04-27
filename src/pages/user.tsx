import { AlipayCircleOutlined } from '@ant-design/icons';
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
} from 'antd';
import { type ReactNode, useState } from 'react';
import { api } from '@/services/api';
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
  const totalVersionCount = versionCounts.reduce<number>(
    (sum, count) => sum + (count ?? 0),
    0,
  );
  const maxVersionCount = Math.max(
    0,
    ...versionCounts.map((count) => count ?? 0),
  );
  const remainingChecks = user.checkQuota;
  const usedChecks =
    typeof remainingChecks === 'number'
      ? Math.max(0, currentQuota.pv - remainingChecks)
      : undefined;
  const usedCheckPercent =
    usedChecks === undefined
      ? 0
      : Math.min(100, (usedChecks / currentQuota.pv) * 100);
  const isCheckQuotaExceeded =
    typeof remainingChecks === 'number' && remainingChecks <= 0;
  const quotaCards = [
    {
      key: 'app',
      item: '应用数量',
      value: `${appCount.toLocaleString()} / ${currentQuota.app.toLocaleString()} 个`,
      percent: Math.min(100, (appCount / currentQuota.app) * 100),
      status: appCount > currentQuota.app ? 'exception' : 'normal',
      note: '当前账户下应用总数',
    },
    {
      key: 'bundle',
      item: '热更包数量',
      value: isVersionCountLoading
        ? '统计中'
        : `${maxVersionCount.toLocaleString()} / ${currentQuota.bundle.toLocaleString()} 个`,
      percent: isVersionCountLoading
        ? 0
        : Math.min(100, (maxVersionCount / currentQuota.bundle) * 100),
      status: maxVersionCount > currentQuota.bundle ? 'exception' : 'normal',
      note: isVersionCountLoading
        ? '正在统计各应用热更包数量'
        : `最高单应用使用量，总计 ${totalVersionCount.toLocaleString()} 个`,
    },
    {
      key: 'pv',
      item: '每日检查额度',
      value:
        usedChecks === undefined
          ? `${currentQuota.pv.toLocaleString()} 次`
          : `${usedChecks.toLocaleString()} / ${currentQuota.pv.toLocaleString()} 次`,
      percent: usedCheckPercent,
      status: isCheckQuotaExceeded ? 'exception' : 'normal',
      note:
        typeof remainingChecks === 'number'
          ? `剩余 ${Math.max(0, remainingChecks).toLocaleString()} 次，按账户全部应用汇总`
          : '客户端检查热更新时消耗，按账户全部应用汇总',
    },
  ] satisfies Array<{
    key: string;
    item: string;
    note: string;
    percent: number;
    status: 'exception' | 'normal';
    value: string;
  }>;
  const staticQuotaCards = [
    {
      key: 'package',
      item: '原生包数量上限',
      value: `${currentQuota.package} 个 / 应用`,
    },
    {
      key: 'packageSize',
      item: '单个原生包大小',
      value: currentQuota.packageSize,
    },
    {
      key: 'bundleSize',
      item: '单个热更包大小',
      value: currentQuota.bundleSize,
    },
  ];
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
          <div className="grid gap-3 xl:grid-cols-3">
            {quotaCards.map(({ key, item, value, percent, status, note }) => (
              <div
                key={key}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">{item}</div>
                  {status === 'exception' && <Tag color="red">超额</Tag>}
                </div>
                <div className="mt-1 font-semibold">{value}</div>
                <Progress
                  className="mt-2"
                  percent={percent}
                  showInfo={false}
                  size="small"
                  status={status}
                />
                <div className="mt-2 text-gray-500 text-xs">{note}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {staticQuotaCards.map(({ key, item, value }) => (
              <div
                key={key}
                className="rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <div className="text-xs text-gray-500">{item}</div>
                <div className="mt-1 font-medium">{value}</div>
              </div>
            ))}
          </div>
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
      </div>
    </div>
  );
}

async function purchase(tier?: string) {
  const orderResponse = await api.createOrder({ tier });
  if (orderResponse?.payUrl) {
    window.location.href = orderResponse.payUrl;
  }
}

export const Component = UserPanel;
