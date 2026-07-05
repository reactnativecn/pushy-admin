import { WarningOutlined } from '@ant-design/icons';
import { Alert, Progress, Tag, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { quotas } from '@/constants/quotas';
import {
  CHECK_QUOTA_LOW_RATIO,
  getCheckQuotaColors,
  getCheckQuotaWarningState,
} from '@/utils/check-quota-warning';
import dayjs from '@/utils/dayjs';
import { cn } from '@/utils/helper';
import { useUserInfo } from '@/utils/hooks';

const { Text } = Typography;

const getTierTitle = (
  tier: string | undefined,
  customTitle: string | undefined,
  t: (key: string) => string,
) => {
  if (!tier) {
    return customTitle ?? '';
  }
  const translatedTier = t(`user.purchasable_tiers.${tier}`);
  if (translatedTier !== `user.purchasable_tiers.${tier}`) {
    return translatedTier;
  }
  return customTitle ?? tier;
};

interface DailyCheckQuotaProps {
  variant: 'account';
}

const useDailyCheckQuotaState = () => {
  const { t } = useTranslation();
  const { user } = useUserInfo();
  const quota = user
    ? (user.quota ?? quotas[user.tier as keyof typeof quotas])
    : undefined;
  const dailyQuota = quota?.pv;
  const remaining = user?.checkQuota;
  const warningState = getCheckQuotaWarningState({
    dailyQuota,
    remaining,
  });

  const tooltip = (
    <div className="text-xs">
      {user && (
        <>
          <div>
            {t('daily_check_quota.tier')}
            {getTierTitle(user.tier, quota?.title, t)}
          </div>
          <div>
            {t('daily_check_quota.expires')}
            {user.tierExpiresAt
              ? dayjs(user.tierExpiresAt).format('YYYY-MM-DD')
              : t('daily_check_quota.no_expire')}
          </div>
        </>
      )}
      {warningState.hasData && (
        <>
          <div>
            {t('daily_check_quota.remaining_today')}
            {warningState.remaining.toLocaleString()} /{' '}
            {warningState.dailyQuota.toLocaleString()}
            {t('daily_check_quota.checks')}
          </div>
          {warningState.remaining < 0 && (
            <div className="font-medium text-red-200">
              {t('daily_check_quota.over_quota')}
              {Math.abs(warningState.remaining).toLocaleString()}
              {t('daily_check_quota.checks')}
            </div>
          )}
        </>
      )}
      {user?.last7dAvg !== undefined && (
        <div>
          {t('daily_check_quota.avg_remaining')}
          {user.last7dAvg.toLocaleString()}
          {t('daily_check_quota.checks')}
        </div>
      )}
    </div>
  );

  return {
    ...warningState,
    tooltip,
    user,
  };
};

export function DailyCheckQuotaUserTrigger({
  compact = false,
  showPlanDetails = false,
  userName,
}: {
  compact?: boolean;
  showPlanDetails?: boolean;
  userName: string;
}) {
  const { t } = useTranslation();
  const quotaState = useDailyCheckQuotaState();
  const { user } = quotaState;
  const quotaColors = getCheckQuotaColors(quotaState.level);
  const tierTitle = user ? getTierTitle(user.tier, user.quota?.title, t) : '';
  const expireLabel = user?.tierExpiresAt
    ? t('daily_check_quota.expire_date', {
        date: dayjs(user.tierExpiresAt).format('YYYY-MM-DD'),
      })
    : t('daily_check_quota.no_expire');
  const warningIcon = (quotaState.isExceeded || quotaState.isLow) && (
    <WarningOutlined
      className={`shrink-0 ${
        quotaState.isExceeded ? 'animate-pulse text-red-600' : 'text-amber-500'
      }`}
    />
  );
  const warningFrameClass = quotaState.isExceeded
    ? 'rounded-lg bg-red-50 ring-1 ring-red-300 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
    : quotaState.isLow
      ? 'rounded-lg bg-amber-50 ring-1 ring-amber-300 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]'
      : undefined;
  const compactWarningFrameClass = cn(
    warningFrameClass,
    quotaState.isWarning ? 'px-1.5' : undefined,
  );
  const wideWarningFrameClass = cn(
    warningFrameClass,
    quotaState.isWarning ? 'px-2 py-1' : undefined,
  );
  const nameClass = quotaState.isExceeded
    ? 'text-red-700'
    : quotaState.isLow
      ? 'text-amber-700'
      : compact
        ? 'text-slate-600'
        : 'text-slate-800';
  const progress = quotaState.hasData && (
    <Progress
      className="mt-0.5"
      percent={quotaState.percent}
      showInfo={false}
      size="small"
      status={quotaState.progressStatus}
      strokeColor={quotaColors.stroke}
      trailColor={quotaColors.trail}
    />
  );
  const content = compact ? (
    <span
      className={cn(
        'flex h-10 w-16 min-w-0 flex-col justify-center text-left',
        compactWarningFrameClass,
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        <span
          className={cn(
            'truncate font-medium text-[11px] leading-4',
            nameClass,
          )}
        >
          {userName}
        </span>
        {warningIcon}
      </span>
      {progress}
    </span>
  ) : (
    <span
      className={cn(
        'flex min-w-0 items-center gap-2.5 text-left',
        wideWarningFrameClass,
      )}
    >
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-medium text-sm leading-5',
            nameClass,
          )}
        >
          {userName}
        </span>
        {showPlanDetails && user && (
          <span className="block truncate text-[11px] text-slate-500 leading-4">
            {tierTitle} · {expireLabel}
          </span>
        )}
        {progress}
      </span>
      {warningIcon}
    </span>
  );

  if (!quotaState.hasData) {
    return content;
  }

  return <Tooltip title={quotaState.tooltip}>{content}</Tooltip>;
}

export default function DailyCheckQuota(_props: DailyCheckQuotaProps) {
  const { t } = useTranslation();
  const quotaState = useDailyCheckQuotaState();
  const { user } = quotaState;
  if (!user) {
    return null;
  }

  if (!quotaState.hasData) {
    return (
      <Text type="secondary">{t('daily_check_quota.quota_not_available')}</Text>
    );
  }

  const message = quotaState.isExceeded
    ? quotaState.remaining < 0
      ? t('daily_check_quota.quota_exceeded', {
          count: Math.abs(quotaState.remaining).toLocaleString(),
        })
      : t('daily_check_quota.quota_exhausted')
    : quotaState.isLow
      ? t('daily_check_quota.quota_low', {
          count: quotaState.remaining.toLocaleString(),
          percent: Math.round(CHECK_QUOTA_LOW_RATIO * 100),
        })
      : t('daily_check_quota.quota_healthy');
  const panelClassName = quotaState.isExceeded
    ? 'border-red-300 bg-red-50 shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
    : quotaState.isLow
      ? 'border-amber-300 bg-amber-50 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]'
      : 'border-slate-200 bg-slate-50';
  const remainingClassName = quotaState.isExceeded
    ? 'text-red-700'
    : quotaState.isLow
      ? 'text-amber-700'
      : 'text-slate-900';
  const quotaTag =
    quotaState.isExceeded && quotaState.remaining < 0
      ? t('daily_check_quota.status_exceeded')
      : quotaState.isExceeded
        ? t('daily_check_quota.status_exhausted')
        : quotaState.isLow
          ? t('daily_check_quota.status_low')
          : t('daily_check_quota.status_healthy');
  const progressColors = getCheckQuotaColors(quotaState.level);

  return (
    <div className="space-y-3">
      <div className={cn('rounded-lg border p-4', panelClassName)}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            {quotaState.isWarning && (
              <WarningOutlined
                className={cn(
                  'mt-0.5 shrink-0 text-lg',
                  quotaState.isExceeded
                    ? 'animate-pulse text-red-600'
                    : 'text-amber-500',
                )}
              />
            )}
            <div>
              <div className="font-medium">{t('daily_check_quota.title')}</div>
              <div className="text-gray-500 text-sm">
                {t('daily_check_quota.description')}
              </div>
            </div>
          </div>
          <Tag
            color={
              quotaState.isExceeded
                ? 'red'
                : quotaState.isLow
                  ? 'orange'
                  : 'green'
            }
            className="m-0"
          >
            {quotaTag}
          </Tag>
        </div>
        <div className="mb-3 grid gap-2 rounded-md bg-container/75 p-3 sm:grid-cols-3">
          <div>
            <div className="text-[11px] text-gray-500">
              {t('daily_check_quota.remaining_label')}
            </div>
            <div
              className={cn(
                'mt-0.5 font-semibold text-lg tabular-nums',
                remainingClassName,
              )}
            >
              {quotaState.remaining.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">
              {t('daily_check_quota.daily_limit')}
            </div>
            <div className="mt-0.5 font-medium text-slate-700 tabular-nums">
              {quotaState.dailyQuota.toLocaleString()}
              {t('daily_check_quota.checks')}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">
              {t('daily_check_quota.status_label')}
            </div>
            <div className="text-gray-500 text-sm">
              {quotaState.remaining < 0
                ? t('daily_check_quota.exceeded_info', {
                    count: Math.abs(quotaState.remaining).toLocaleString(),
                  })
                : t('daily_check_quota.percent_remaining', {
                    percent: quotaState.percent.toFixed(0),
                  })}
            </div>
          </div>
        </div>
        <Tooltip title={quotaState.tooltip}>
          <Progress
            percent={quotaState.percent}
            showInfo={false}
            status={quotaState.progressStatus}
            strokeColor={progressColors.stroke}
            strokeLinecap="round"
            trailColor={quotaState.isWarning ? progressColors.trail : undefined}
          />
        </Tooltip>
        <div className="mt-2 text-gray-500 text-xs">
          {t('daily_check_quota.hint')}
        </div>
      </div>
      {(quotaState.isExceeded || quotaState.isLow) && (
        <Alert
          showIcon
          type={quotaState.isExceeded ? 'error' : 'warning'}
          message={message}
        />
      )}
    </div>
  );
}
