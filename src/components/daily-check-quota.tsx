import { WarningOutlined } from '@ant-design/icons';
import { Alert, Progress, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { quotas } from '@/constants/quotas';
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
  const hasData = !!dailyQuota && typeof remaining === 'number';

  const remainingRatio = hasData ? remaining / dailyQuota : 0;
  const percent = Math.max(0, Math.min(100, remainingRatio * 100));
  const isExceeded = hasData && remaining <= 0;
  const isLow = !isExceeded && remainingRatio <= 0.2;
  const status: 'exception' | 'normal' =
    isExceeded || isLow ? 'exception' : 'normal';
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
      {hasData && (
        <>
          <div>
            今日剩余额度：{Math.max(0, remaining).toLocaleString()} /{' '}
            {dailyQuota.toLocaleString()} 次
          </div>
          {remaining < 0 && (
            <div>已超出：{Math.abs(remaining).toLocaleString()} 次</div>
          )}
        </>
      )}
      {user?.last7dAvg !== undefined && (
        <div>7 日平均剩余额度：{user.last7dAvg.toLocaleString()} 次</div>
      )}
    </div>
  );

  return {
    hasData,
    isExceeded,
    isLow,
    percent,
    status,
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
        quotaState.isExceeded ? 'text-red-500' : 'text-amber-500'
      }`}
    />
  );
  const progress = quotaState.hasData && (
    <Progress
      className="mt-0.5"
      percent={quotaState.percent}
      showInfo={false}
      size="small"
      status={quotaState.status}
      strokeColor={strokeColor}
      trailColor="#e5e7eb"
    />
  );
  const content = compact ? (
    <span className="flex h-10 w-16 min-w-0 flex-col justify-center text-left">
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate font-medium text-[11px] text-slate-600 leading-4">
          {userName}
        </span>
        {warningIcon}
      </span>
      {progress}
    </span>
  ) : (
    <span className="flex min-w-0 items-center gap-2.5 text-left">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-800 text-sm leading-5">
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
    ? '今日检查额度已用尽，请升级套餐或等待每日额度重置。'
    : quotaState.isLow
      ? '今日检查额度偏低，继续发布或大量客户端查询时需要留意。'
      : '今日检查额度状态正常。';

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-medium">每日检查额度</div>
            <div className="text-gray-500 text-sm">
              客户端检查热更新时消耗，按账户下所有应用合并计算，每日重置。
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
          >
            {quotaState.isExceeded
              ? '已用尽'
              : quotaState.isLow
                ? '偏低'
                : '正常'}
          </Tag>
        </div>
        <Tooltip title={quotaState.tooltip}>
          <Progress
            percent={quotaState.percent}
            showInfo={false}
            status={quotaState.status}
            strokeLinecap="round"
          />
        </Tooltip>
        <div className="mt-2 text-gray-500 text-xs">
          页面不直接展示具体次数；鼠标悬停进度条可查看剩余额度、套餐上限和 7
          日平均。
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
