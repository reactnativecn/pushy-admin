import { LogoutOutlined } from '@ant-design/icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Button,
  Descriptions,
  Grid,
  message,
  Popover,
  Space,
  Spin,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { logout } from '@/services/auth';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { userKeys } from '@/utils/query-keys';
import { PRICING_LINK } from '../../constants/links';
import { quotas } from '../../constants/quotas';
import {
  RenewalPurchaseButton,
  UpgradePurchaseControls,
} from './purchase-controls';
import { QuotaDetailsPanel, type QuotaUsageRow } from './quota-details';

const SUPPORT_EMAIL = 'hi@charmlot.com';

const getInvoiceHint = (t: (key: string) => string) => (
  <div>
    <p>
      {t('user.invoice_hint_before_email')}
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      {t('user.invoice_hint_after_email')}
    </p>
    <p>
      <strong>{t('user.invoice_company')}</strong>
    </p>
    <p>{t('user.invoice_default')}</p>
  </div>
);

function UserPanel() {
  const { t } = useTranslation();
  const { user, displayExpireDay, displayRemainingDays } = useUserInfo();
  const { apps } = useAppList();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const appList = apps ?? [];
  const versionCountQueries = useQueries({
    queries: appList.map((app) => ({
      queryKey: userKeys.accountQuotaVersions(app.id),
      queryFn: () => api.getVersions({ appId: app.id, limit: 1 }),
      staleTime: 60_000,
    })),
  });
  const packageCountQueries = useQueries({
    queries: appList.map((app) => ({
      queryKey: userKeys.accountQuotaPackages(app.id),
      queryFn: () => api.getPackages(app.id),
      staleTime: 60_000,
    })),
  });
  const orderQuotesQuery = useQuery({
    queryKey: userKeys.orderQuotes([
      user?.tier,
      user?.tierExpiresAt,
      user?.quota?.pv,
      user?.quota?.price,
      user?.quota?.monthlyRenewalPrice,
      user?.quota?.checkUpdateAddonUnits,
    ]),
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
  const changeEmailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    t('user.change_email_subject'),
  )}&body=${encodeURIComponent(t('user.change_email_body', { email }))}`;
  const defaultQuota = quotas[tier as keyof typeof quotas];
  const currentQuota = quota || defaultQuota;

  const tierLabelKey = tier ? `user.purchasable_tiers.${tier}` : '';
  const translatedTierLabel = tierLabelKey ? t(tierLabelKey) : '';
  const tierDisplay =
    translatedTierLabel && translatedTierLabel !== tierLabelKey
      ? translatedTierLabel
      : currentQuota.title;
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
          <Space size="small" wrap className="min-w-0">
            <span className="break-all">{email}</span>
            <Button href={changeEmailHref} size="small" type="link">
              {t('user.change_email')}
            </Button>
          </Space>
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

export const Component = UserPanel;
