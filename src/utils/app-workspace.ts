import { useMemo } from 'react';
import { sortAppsByPinned, usePinnedAppIds } from '@/utils/app-preferences';
import { useAppList, useUserInfo } from '@/utils/hooks';

// 应用选择相关的共用数据：管理页抽屉、顶部应用切换器、指标页都从这里取应用列表

export interface AppDrawerItem {
  id: number;
  name: string;
  platform: 'android' | 'ios' | 'harmony';
  status?: string | null;
  appKey?: string | null;
  checkCount?: number;
  downloadUrl?: string | null;
  ignoreBuildTime?: 'enabled' | 'disabled' | null;
}

export function useAppWorkspaceList(): {
  apps: AppDrawerItem[];
  isAdmin: boolean;
  isLoading: boolean;
  totalAppCount: number;
} {
  const { apps: userApps, isLoading: isLoadingUserApps } = useAppList();
  const { user } = useUserInfo();
  const isAdmin = user?.admin === true;

  const pinnedAppIds = usePinnedAppIds();
  const apps: AppDrawerItem[] = useMemo(
    () => sortAppsByPinned(userApps ?? [], pinnedAppIds),
    [userApps, pinnedAppIds],
  );
  return {
    apps,
    isAdmin,
    isLoading: isLoadingUserApps,
    totalAppCount: apps.length,
  };
}
