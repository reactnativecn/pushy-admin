import { safeStorage } from '@/utils/storage';
import { createStoredPreference } from '@/utils/stored-preference';

// 应用相关的本地偏好：管理页应用抽屉的位置/折叠状态、最近访问的应用

export const RECENT_APP_STORAGE_KEY = 'pushy_recent_app_ids';
export const MAX_RECENT_APP_COUNT = 6;

export type ManageAppDrawerPlacement = 'left' | 'right' | 'hidden';

export const manageAppDrawerPlacementPreference =
  createStoredPreference<ManageAppDrawerPlacement>({
    changeEvent: 'manage-app-drawer-placement-change',
    key: 'pushy_manage_app_drawer_placement',
    parse: (raw) => (raw === 'right' || raw === 'hidden' ? raw : 'left'),
    serialize: (placement) => placement,
  });

export const manageAppDrawerCollapsedPreference =
  createStoredPreference<boolean>({
    changeEvent: 'manage-app-drawer-collapsed-change',
    key: 'pushy_manage_app_drawer_collapsed',
    parse: (raw) => raw === '1',
    serialize: (collapsed) => (collapsed ? '1' : '0'),
  });

export const getManageAppDrawerPlacement =
  manageAppDrawerPlacementPreference.get;
export const setManageAppDrawerPlacement =
  manageAppDrawerPlacementPreference.set;
export const getManageAppDrawerCollapsed =
  manageAppDrawerCollapsedPreference.get;
export const setManageAppDrawerCollapsed =
  manageAppDrawerCollapsedPreference.set;

export const getRecentAppIds = () => {
  if (typeof window === 'undefined') {
    return [] as number[];
  }

  try {
    const parsed = JSON.parse(safeStorage.get(RECENT_APP_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is number => Number.isInteger(value));
  } catch {
    return [];
  }
};

export const rememberRecentApp = (appId: number) => {
  if (typeof window === 'undefined' || !Number.isInteger(appId)) {
    return [] as number[];
  }

  const next = [appId, ...getRecentAppIds().filter((id) => id !== appId)].slice(
    0,
    MAX_RECENT_APP_COUNT,
  );
  safeStorage.set(RECENT_APP_STORAGE_KEY, JSON.stringify(next));
  return next;
};
