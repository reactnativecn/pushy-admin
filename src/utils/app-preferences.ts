import { useMemo } from 'react';
import { safeStorage } from '@/utils/storage';
import {
  createStoredPreference,
  useStoredPreference,
} from '@/utils/stored-preference';

// 应用相关的本地偏好：管理页应用抽屉的位置/折叠状态、最近访问的应用、置顶的应用

export const RECENT_APP_STORAGE_KEY = 'pushy_recent_app_ids';
export const MAX_RECENT_APP_COUNT = 6;
export const PINNED_APP_STORAGE_KEY = 'pushy_pinned_app_ids';

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

const parseAppIds = (raw: string | null): number[] => {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is number => Number.isInteger(value));
  } catch {
    return [];
  }
};

export const getRecentAppIds = () => {
  if (typeof window === 'undefined') {
    return [] as number[];
  }

  return parseAppIds(safeStorage.get(RECENT_APP_STORAGE_KEY));
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

// 偏好的快照必须是原始值，所以存序列化后的字符串，用的时候再解析
const pinnedAppIdsPreference = createStoredPreference<string>({
  changeEvent: 'pinned-app-ids-change',
  key: PINNED_APP_STORAGE_KEY,
  parse: (raw) => raw ?? '[]',
  serialize: (value) => value,
});

export const getPinnedAppIds = () => parseAppIds(pinnedAppIdsPreference.get());

/** 切换置顶状态：新置顶的排在最前面。 */
export const togglePinnedApp = (appId: number) => {
  const pinnedIds = getPinnedAppIds();
  const next = pinnedIds.includes(appId)
    ? pinnedIds.filter((id) => id !== appId)
    : [appId, ...pinnedIds];
  pinnedAppIdsPreference.set(JSON.stringify(next));
};

/** 把已置顶的应用挪到另一个已置顶应用的位置；任一方未置顶时不做处理。 */
export const movePinnedApp = (appId: number, targetAppId: number) => {
  const pinnedIds = getPinnedAppIds();
  const from = pinnedIds.indexOf(appId);
  const to = pinnedIds.indexOf(targetAppId);
  if (from < 0 || to < 0 || from === to) {
    return;
  }
  pinnedIds.splice(from, 1);
  pinnedIds.splice(to, 0, appId);
  pinnedAppIdsPreference.set(JSON.stringify(pinnedIds));
};

export const usePinnedAppIds = () => {
  const raw = useStoredPreference(pinnedAppIdsPreference);
  return useMemo(() => parseAppIds(raw), [raw]);
};

/** 置顶的应用排最前，其余保持原有顺序；已删除或无权访问的应用 id 直接忽略。 */
export const sortAppsByPinned = <T extends { id: number }>(
  apps: T[],
  pinnedIds: number[],
): T[] => {
  const pinnedIdSet = new Set(pinnedIds);
  if (pinnedIdSet.size === 0) {
    return apps;
  }
  const appById = new Map(apps.map((app) => [app.id, app]));
  const pinnedApps = [...pinnedIdSet]
    .map((id) => appById.get(id))
    .filter((app): app is T => !!app);
  return [...pinnedApps, ...apps.filter((app) => !pinnedIdSet.has(app.id))];
};
