import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/helper';
import type {
  ServiceStatusSummary,
  ServiceStatusTarget,
  ServiceStatusTargetKey,
} from './metrics';

// 节点卡片横排：面板默认不渲染，点卡片才弹窗展示（见 index.tsx）。
// 卡片本身承担概览职责——状态点 + 请求/延迟/命中三项，扫一眼就知道哪台异常。
export function ServiceTargetCards({
  items,
  onSelect,
}: {
  items: Array<{
    hasData: boolean;
    isError: boolean;
    isFetching: boolean;
    summary: ServiceStatusSummary;
    target: ServiceStatusTarget;
  }>;
  onSelect: (key: ServiceStatusTargetKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map(({ hasData, isError, isFetching, summary, target }) => {
        const statusTitle = isError
          ? t('admin_service_status.sidebar_failed')
          : isFetching && !hasData
            ? t('admin_service_status.sidebar_loading')
            : t('admin_service_status.sidebar_healthy');

        return (
          <button
            className={cn(
              'min-w-0 cursor-pointer rounded-lg border bg-container p-3 text-left shadow-sm transition-all',
              'hover:border-blue-300 hover:shadow-md',
              isError ? 'border-red-200' : 'border-slate-200',
            )}
            key={target.key}
            onClick={() => onSelect(target.key)}
            title={t('admin_service_status.card_open_hint')}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 font-semibold text-base text-slate-900">
                {target.label}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-slate-500 text-xs"
                title={target.host}
              >
                {target.host}
              </span>
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  isError
                    ? 'bg-red-500'
                    : isFetching && !hasData
                      ? 'bg-blue-400'
                      : 'bg-emerald-500',
                )}
                title={statusTitle}
              />
            </span>
            <span className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <span className="min-w-0">
                <span className="block text-slate-400">
                  {t('admin_service_status.sidebar_req_err')}
                </span>
                <span className="block truncate font-medium text-slate-700 tabular-nums">
                  {summary.requestText}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-slate-400">
                  {t('admin_service_status.sidebar_latency')}
                </span>
                <span className="block truncate font-medium text-slate-700 tabular-nums">
                  {summary.delayText}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-slate-400">
                  {t('admin_service_status.sidebar_hit')}
                </span>
                <span className="block truncate font-medium text-slate-700 tabular-nums">
                  {summary.hitText}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
