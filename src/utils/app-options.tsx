import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import PlatformIcon, { PLATFORM_LABELS } from '@/components/platform-icon';
import { api } from '@/services/api';
import { appKeys } from '@/utils/query-keys';

export interface AppOption {
  label: ReactNode;
  value: number;
  /** 纯文本名称，供 Select 搜索（showSearch.optionFilterProp）使用 */
  name: string;
}

/** 选应用时搜索按名称匹配（label 带图标不是纯文本） */
export const APP_OPTION_SEARCH = { optionFilterProp: 'name' };

/**
 * 应用下拉选项 + id→名称映射。API Key / MCP 连接 / 成员几张页面都要在
 * 弹窗里选应用、在表格里把 appIds 翻成名字，统一复用同一份 appList 缓存。
 * 不同平台常有同名应用，选项里带上平台图标和名称以便区分。
 * enabled 交给调用方：只在弹窗打开或有管理权限时才发请求。
 */
export function useAppOptions({ enabled = true }: { enabled?: boolean } = {}) {
  const { data } = useQuery({
    queryKey: appKeys.list(),
    queryFn: api.appList,
    enabled,
  });
  const apps = data?.data ?? [];
  const appOptions: AppOption[] = apps.map((app) => ({
    label: (
      <span className="inline-flex items-center gap-1">
        <PlatformIcon platform={app.platform} />
        <span>{app.name}</span>
        <span className="text-xs text-gray-400">
          {PLATFORM_LABELS[app.platform]}
        </span>
      </span>
    ),
    value: app.id,
    name: app.name,
  }));
  const appNameById = new Map(
    apps.map((app) => [
      app.id,
      `${app.name} (${PLATFORM_LABELS[app.platform]})`,
    ]),
  );
  return { appOptions, appNameById };
}
