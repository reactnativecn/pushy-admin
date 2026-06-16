export const CHECK_QUOTA_LOW_RATIO = 0.2;

export type CheckQuotaWarningLevel = 'normal' | 'low' | 'exceeded';

interface CheckQuotaWarningInput {
  dailyQuota?: number;
  remaining?: number;
}

export function getCheckQuotaWarningState({
  dailyQuota,
  remaining,
}: CheckQuotaWarningInput) {
  const hasData =
    typeof dailyQuota === 'number' &&
    Number.isFinite(dailyQuota) &&
    dailyQuota > 0 &&
    typeof remaining === 'number' &&
    Number.isFinite(remaining);

  if (!hasData) {
    return {
      dailyQuota,
      hasData,
      isExceeded: false,
      isLow: false,
      isWarning: false,
      level: 'normal' as CheckQuotaWarningLevel,
      percent: 0,
      progressStatus: 'normal' as const,
      remaining,
      remainingRatio: 0,
    };
  }

  const remainingRatio = remaining / dailyQuota;
  const percent = Math.max(0, Math.min(100, remainingRatio * 100));
  const level: CheckQuotaWarningLevel =
    remaining <= 0
      ? 'exceeded'
      : remainingRatio <= CHECK_QUOTA_LOW_RATIO
        ? 'low'
        : 'normal';
  const isExceeded = level === 'exceeded';
  const isLow = level === 'low';

  return {
    dailyQuota,
    hasData,
    isExceeded,
    isLow,
    isWarning: isExceeded || isLow,
    level,
    percent,
    progressStatus:
      isExceeded || isLow ? ('exception' as const) : ('normal' as const),
    remaining,
    remainingRatio,
  };
}
