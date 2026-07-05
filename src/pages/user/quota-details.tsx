import { WarningOutlined } from '@ant-design/icons';
import { Progress, Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Quota, Tier } from '@/types';
import {
  CHECK_QUOTA_LOW_RATIO,
  getCheckQuotaColors,
  getCheckQuotaWarningState,
} from '@/utils/check-quota-warning';
import { cn } from '@/utils/helper';
import { quotas } from '../../constants/quotas';
import { type OrderQuotes, useOrderBillingConfig } from './billing';
import { CheckUpdateAddonPurchase } from './purchase-controls';

export type QuotaUsageRow = {
  key: string;
  label: string;
  limit: number;
  loading?: boolean;
  note: string;
  percent: number;
  status: 'exception' | 'normal';
  value: string;
};

export function QuotaDetailsPanel({
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
  const quotaColors = getCheckQuotaColors(quotaWarning.level);
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
                quotaWarning.isWarning ? quotaColors.stroke : undefined
              }
              trailColor={
                quotaWarning.isWarning ? quotaColors.trail : undefined
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
                : 'bg-primary hover:bg-primary-hover';
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
