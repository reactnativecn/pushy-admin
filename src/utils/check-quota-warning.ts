export const CHECK_QUOTA_LOW_RATIO = 0.2;

export type CheckQuotaWarningLevel = 'normal' | 'low' | 'exceeded';

/**
 * 配额三态（正常 / 偏低 / 超额）对应的进度条颜色。
 * 前景色走 antd CSS 变量（cssVar 模式下运行时注入），与全站主题联动；
 * 轨道色是与之匹配的浅色底，antd 未暴露成单一 token，故集中定义在此。
 */
export const CHECK_QUOTA_COLORS: Record<
  CheckQuotaWarningLevel,
  { stroke: string; trail: string }
> = {
  exceeded: {
    stroke: 'var(--ant-color-error)',
    trail: 'var(--ant-color-error-bg)',
  },
  low: {
    stroke: 'var(--ant-color-warning)',
    trail: 'var(--ant-color-warning-bg)',
  },
  normal: {
    stroke: 'var(--ant-color-primary)',
    trail: 'var(--ant-color-fill-secondary)',
  },
};

export function getCheckQuotaColors(level: CheckQuotaWarningLevel) {
  return CHECK_QUOTA_COLORS[level];
}

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
