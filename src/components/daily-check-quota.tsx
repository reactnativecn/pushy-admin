import { WarningOutlined } from '@ant-design/icons';
import { Alert, Progress, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { quotas } from '@/constants/quotas';
import {
  CHECK_QUOTA_LOW_RATIO,
  getCheckQuotaWarningState,
} from '@/utils/check-quota-warning';
import { cn } from '@/utils/helper';
import { useUserInfo } from '@/utils/hooks';

const { Text } = Typography;

interface DailyCheckQuotaProps {
  variant: 'account';
}

const useDailyCheckQuotaState = () => {
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
            套餐：
            {quota?.title ??
              quotas[user.tier as keyof typeof quotas]?.title ??
              user.tier}
          </div>
          <div>
            到期：
            {user.tierExpiresAt
              ? dayjs(user.tierExpiresAt).format('YYYY-MM-DD')
              : '无'}
          </div>
        </>
      )}
      {warningState.hasData && (
        <>
          <div>
            今日剩余额度：{warningState.remaining.toLocaleString()} /{' '}
            {warningState.dailyQuota.toLocaleString()} 次
          </div>
          {warningState.remaining < 0 && (
            <div className="font-medium text-red-200">
              已超出：{Math.abs(warningState.remaining).toLocaleString()} 次
            </div>
          )}
        </>
      )}
      {user?.last7dAvg !== undefined && (
        <div>7 日平均剩余额度：{user.last7dAvg.toLocaleString()} 次</div>
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
  const quotaState = useDailyCheckQuotaState();
  const { user } = quotaState;
  const strokeColor = quotaState.isExceeded
    ? '#ef4444'
    : quotaState.isLow
      ? '#f59e0b'
      : '#2563eb';
  const tierTitle = user
    ? (user.quota?.title ??
      quotas[user.tier as keyof typeof quotas]?.title ??
      user.tier)
    : '';
  const expireLabel = user?.tierExpiresAt
    ? `${dayjs(user.tierExpiresAt).format('YYYY-MM-DD')} 到期`
    : '无到期';
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
      strokeColor={strokeColor}
      trailColor={
        quotaState.isExceeded
          ? '#fecaca'
          : quotaState.isLow
            ? '#fde68a'
            : '#e5e7eb'
      }
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
  const quotaState = useDailyCheckQuotaState();
  const { user } = quotaState;
  if (!user) {
    return null;
  }

  if (!quotaState.hasData) {
    return (
      <Text type="secondary">
        暂无今日检查额度数据。额度用于客户端查询是否有可用热更新，按账户下所有应用汇总。
      </Text>
    );
  }

  const message = quotaState.isExceeded
    ? quotaState.remaining < 0
      ? `今日检查额度已超出 ${Math.abs(quotaState.remaining).toLocaleString()} 次，客户端检查可能返回空数据。`
      : '今日检查额度已用尽，请升级套餐或等待每日额度重置。'
    : quotaState.isLow
      ? `今日检查额度只剩 ${quotaState.remaining.toLocaleString()} 次，低于 ${Math.round(
          CHECK_QUOTA_LOW_RATIO * 100,
        )}%，请留意客户端检查频率。`
      : '今日检查额度状态正常。';
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
      ? '已超额'
      : quotaState.isExceeded
        ? '已用尽'
        : quotaState.isLow
          ? '偏低'
          : '正常';
  const progressStrokeColor = quotaState.isExceeded
    ? '#ef4444'
    : quotaState.isLow
      ? '#f59e0b'
      : '#2563eb';

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
              <div className="font-medium">每日检查额度</div>
              <div className="text-gray-500 text-sm">
                客户端检查热更新时消耗，按账户下所有应用合并计算，每日重置。
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
        <div className="mb-3 grid gap-2 rounded-md bg-white/75 p-3 sm:grid-cols-3">
          <div>
            <div className="text-[11px] text-gray-500">今日剩余额度</div>
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
            <div className="text-[11px] text-gray-500">每日上限</div>
            <div className="mt-0.5 font-medium text-slate-700 tabular-nums">
              {quotaState.dailyQuota.toLocaleString()} 次
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">状态</div>
            <div className="text-gray-500 text-sm">
              {quotaState.remaining < 0
                ? `已超出 ${Math.abs(quotaState.remaining).toLocaleString()} 次`
                : `${quotaState.percent.toFixed(0)}% 剩余`}
            </div>
          </div>
        </div>
        <Tooltip title={quotaState.tooltip}>
          <Progress
            percent={quotaState.percent}
            showInfo={false}
            status={quotaState.progressStatus}
            strokeColor={progressStrokeColor}
            strokeLinecap="round"
            trailColor={
              quotaState.isExceeded
                ? '#fecaca'
                : quotaState.isLow
                  ? '#fde68a'
                  : undefined
            }
          />
        </Tooltip>
        <div className="mt-2 text-gray-500 text-xs">
          鼠标悬停进度条可查看套餐、到期时间和最近 7 日平均剩余额度。
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
