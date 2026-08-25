import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { appKeys } from '@/utils/query-keys';

export interface AppOption {
  label: string;
  value: number;
}

/**
 * 应用下拉选项 + id→名称映射。API Key / MCP 连接 / 成员几张页面都要在
 * 弹窗里选应用、在表格里把 appIds 翻成名字，统一复用同一份 appList 缓存。
 * enabled 交给调用方：只在弹窗打开或有管理权限时才发请求。
 */
export function useAppOptions({ enabled = true }: { enabled?: boolean } = {}) {
  const { data } = useQuery({
    queryKey: appKeys.list(),
    queryFn: api.appList,
    enabled,
  });
  const appOptions: AppOption[] = (data?.data ?? []).map((app) => ({
    label: app.name,
    value: app.id,
  }));
  const appNameById = new Map(appOptions.map((o) => [o.value, o.label]));
  return { appOptions, appNameById };
}
