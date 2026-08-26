import type { Quota } from '@/types';
import type { QuotaUsageRow } from './quota-details';

/** 账户页配额行的纯算术:单应用最大数量、占比与超限状态 */

// 各应用的计数可能还没回来,缺省按 0 算;没有应用时也要给 0 而不是 -Infinity
export const getMaxCount = (counts: Array<number | undefined>) =>
  Math.max(0, ...counts.map((count) => count ?? 0));

export const getQuotaUsage = (used: number, limit: number) => ({
  percent: Math.min(100, (used / limit) * 100),
  status: used > limit ? ('exception' as const) : ('normal' as const),
});

export function buildQuotaUsageRows({
  t,
  quota,
  appCount,
  maxVersionCount,
  maxPackageCount,
  isVersionCountLoading,
  isPackageCountLoading,
}: {
  t: (key: string) => string;
  quota: Pick<Quota, 'app' | 'bundle' | 'package'>;
  appCount: number;
  maxVersionCount: number;
  maxPackageCount: number;
  isVersionCountLoading: boolean;
  isPackageCountLoading: boolean;
}): QuotaUsageRow[] {
  const unit = t('user.count_unit');
  const appUsage = getQuotaUsage(appCount, quota.app);
  const bundleUsage = getQuotaUsage(maxVersionCount, quota.bundle);
  const packageUsage = getQuotaUsage(maxPackageCount, quota.package);

  return [
    {
      key: 'app',
      label: t('user.app_count_label'),
      limit: quota.app,
      note: t('user.app_count_note'),
      percent: appUsage.percent,
      status: appUsage.status,
      value: `${appCount.toLocaleString()} / ${quota.app.toLocaleString()} ${unit}`,
    },
    {
      key: 'bundle',
      label: t('user.hotfix_count_label'),
      limit: quota.bundle,
      loading: isVersionCountLoading,
      note: isVersionCountLoading
        ? t('user.counting_hotfix')
        : t('user.max_single_app'),
      // 还在统计时进度条先归零,别拿半截数据吓人
      percent: isVersionCountLoading ? 0 : bundleUsage.percent,
      status: bundleUsage.status,
      value: isVersionCountLoading
        ? t('user.counting')
        : `${maxVersionCount.toLocaleString()} / ${quota.bundle.toLocaleString()} ${unit}`,
    },
    {
      key: 'package',
      label: t('user.native_pkg_count_label'),
      limit: quota.package,
      loading: isPackageCountLoading,
      note: isPackageCountLoading
        ? t('user.counting_native')
        : t('user.max_single_app'),
      percent: isPackageCountLoading ? 0 : packageUsage.percent,
      status: packageUsage.status,
      value: isPackageCountLoading
        ? t('user.counting')
        : `${maxPackageCount.toLocaleString()} / ${quota.package.toLocaleString()} ${unit}`,
    },
  ];
}
