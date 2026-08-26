import { LogoutOutlined } from '@ant-design/icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Descriptions, Grid, message, Popover, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { logout } from '@/services/auth';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { userKeys } from '@/utils/query-keys';
import { PRICING_LINK } from '../../constants/links';
import { quotas } from '../../constants/quotas';
import { EmailChangeButton, PasswordChangeButton } from './account-security';
import {
  RenewalPurchaseButton,
  UpgradePurchaseControls,
} from './purchase-controls';
import { QuotaDetailsPanel } from './quota-details';
import { buildQuotaUsageRows, getMaxCount } from './quota-usage';

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
      queryFn: () => api.getPackageCount(app.id),
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
  const packageCounts = packageCountQueries.map((query) => query.data);
  const isPackageCountLoading = packageCountQueries.some(
    (query) => query.isLoading,
  );
  const maxVersionCount = getMaxCount(versionCounts);
  const maxPackageCount = getMaxCount(packageCounts);
  const remainingChecks = user.checkQuota;
  const quotaUsageRows = buildQuotaUsageRows({
    t,
    quota: currentQuota,
    appCount,
    maxVersionCount,
    maxPackageCount,
    isVersionCountLoading,
    isPackageCountLoading,
  });
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
        <Descriptions.Item label={t('user.security_settings')}>
          <div className="flex flex-wrap items-center gap-3">
            <EmailChangeButton currentEmail={email} />
            <PasswordChangeButton />
          </div>
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
