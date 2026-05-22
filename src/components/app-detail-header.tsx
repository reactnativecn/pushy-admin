import {
  AppstoreOutlined,
  LineChartOutlined,
  SettingFilled,
} from '@ant-design/icons';
import { Breadcrumb, Button, Tag } from 'antd';
import type { ReactNode } from 'react';
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
  appNameFallback = '选择应用',
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
  return (
    <div className="mb-4 grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <Breadcrumb
        className="min-w-0"
        items={[
          {
            title: sectionLabel,
          },
          {
            title: (
              <span className="inline-flex max-w-full items-center gap-1">
                <PlatformIcon platform={app?.platform} className="mr-1" />
                <span className="max-w-[160px] truncate md:max-w-none">
                  {app?.name || appNameFallback}
                </span>
                {app?.status === 'paused' && <Tag className="ml-2">暂停</Tag>}
              </span>
            ),
          },
        ]}
      />

      <div
        className="flex w-full justify-center gap-2 md:w-auto"
        role="tablist"
      >
        <AppDetailTab
          active={activeView === 'management'}
          disabled={managementDisabled}
          icon={<AppstoreOutlined />}
          label="应用发布"
          onClick={onManagementClick}
        />
        <AppDetailTab
          active={activeView === 'metrics'}
          disabled={metricsDisabled}
          icon={<LineChartOutlined />}
          label="实时数据"
          onClick={onMetricsClick}
        />
      </div>

      <div className="flex justify-end">
        {onSettingsClick && (
          <Button
            icon={<SettingFilled />}
            size="large"
            disabled={settingsDisabled}
            onClick={onSettingsClick}
          >
            应用设置
          </Button>
        )}
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
        'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 font-medium text-base text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-600 md:min-w-36 md:flex-none',
        active
          ? 'border-blue-600! bg-blue-600! text-white! shadow-none hover:border-blue-600! hover:bg-blue-600! hover:text-white!'
          : undefined,
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 shadow-none hover:border-slate-200 hover:bg-slate-50 hover:text-slate-300'
          : undefined,
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
