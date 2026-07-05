import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/helper';
import type {
  ServiceStatusSummary,
  ServiceStatusTarget,
  ServiceStatusTargetKey,
} from './metrics';

export function ServiceTargetSidebar({
  activeKey,
  items,
  onChange,
}: {
  activeKey: ServiceStatusTargetKey;
  items: Array<{
    hasData: boolean;
    isError: boolean;
    isFetching: boolean;
    summary: ServiceStatusSummary;
    target: ServiceStatusTarget;
  }>;
  onChange: (key: ServiceStatusTargetKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <aside className="min-w-0">
      <div className="space-y-2 lg:sticky lg:top-6">
        {items.map(({ hasData, isError, isFetching, summary, target }) => {
          const isActive = target.key === activeKey;
          const statusTitle = isError
            ? t('admin_service_status.sidebar_failed')
            : isFetching && !hasData
              ? t('admin_service_status.sidebar_loading')
              : t('admin_service_status.sidebar_healthy');

          return (
            <button
              aria-pressed={isActive}
              className={cn(
                'w-full cursor-pointer rounded-lg border bg-container p-3 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md',
                isActive
                  ? 'border-primary bg-blue-50 shadow-none'
                  : 'border-slate-200',
              )}
              key={target.key}
              onClick={() => onChange(target.key)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'shrink-0 font-semibold text-base',
                    isActive ? 'text-primary' : 'text-slate-900',
                  )}
                >
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
    </aside>
  );
}
