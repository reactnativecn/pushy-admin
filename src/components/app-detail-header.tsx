import {
  AppstoreOutlined,
  LineChartOutlined,
  SettingFilled,
} from '@ant-design/icons';
import { Breadcrumb, Button, Tag } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/helper';
import PlatformIcon from './platform-icon';

export interface AppDetailHeaderApp {
  name?: string;
  platform?: 'android' | 'ios' | 'harmony';
  status?: string | null;
}

export function AppDetailHeader({
  activeView,
  app,
  appNameFallback,
  managementDisabled,
  metricsDisabled,
  onManagementClick,
  onMetricsClick,
  onSettingsClick,
  sectionLabel,
  settingsDisabled,
}: {
  activeView: 'management' | 'metrics';
  app?: AppDetailHeaderApp;
  appNameFallback?: ReactNode;
  managementDisabled?: boolean;
  metricsDisabled?: boolean;
  onManagementClick?: () => void;
  onMetricsClick?: () => void;
  onSettingsClick?: () => void;
  sectionLabel: string;
  settingsDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const fallbackName = appNameFallback ?? t('app_detail_header.select_app');

  return (
    <div className="mb-4 grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center justify-between gap-3 md:contents">
        <Breadcrumb
          className="min-w-0 md:col-start-1 md:row-start-1"
          items={[
            {
              title: sectionLabel,
            },
            {
              title: (
                <span className="inline-flex max-w-full items-center gap-1">
                  <PlatformIcon platform={app?.platform} className="mr-1" />
                  <span className="max-w-[160px] truncate md:max-w-none">
                    {app?.name || fallbackName}
                  </span>
                  {app?.status === 'paused' && (
                    <Tag className="ml-2">{t('app_detail_header.paused')}</Tag>
                  )}
                </span>
              ),
            },
          ]}
        />

        <div className="flex shrink-0 justify-end md:col-start-3 md:row-start-1">
          {onSettingsClick && (
            <Button
              className="shrink-0 !h-9 !px-3 !text-sm md:!h-10 md:!px-4 md:!text-base"
              icon={<SettingFilled />}
              disabled={settingsDisabled}
              onClick={onSettingsClick}
            >
              {t('app_detail_header.app_settings')}
            </Button>
          )}
        </div>
      </div>

      <div
        className="flex w-full justify-center gap-2 md:col-start-2 md:row-start-1 md:w-auto"
        role="tablist"
      >
        <AppDetailTab
          active={activeView === 'management'}
          disabled={managementDisabled}
          icon={<AppstoreOutlined />}
          label={t('app_detail_header.tab_releases')}
          onClick={onManagementClick}
        />
        <AppDetailTab
          active={activeView === 'metrics'}
          disabled={metricsDisabled}
          icon={<LineChartOutlined />}
          label={t('app_detail_header.tab_metrics')}
          onClick={onMetricsClick}
        />
      </div>
    </div>
  );
}

function AppDetailTab({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 font-medium text-base text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-primary md:min-w-36 md:flex-none',
        active
          ? 'border-primary! bg-primary! text-white! shadow-none hover:border-primary! hover:bg-primary! hover:text-white!'
          : undefined,
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 shadow-none hover:border-slate-200 hover:bg-slate-50 hover:text-slate-300'
          : 'cursor-pointer',
      )}
      disabled={disabled}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
