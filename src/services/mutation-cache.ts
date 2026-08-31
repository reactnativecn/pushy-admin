import type { App } from '@/types';

export type AppListCache = { data?: App[] };

/** Do not create a synthetic empty list when the list query was never loaded. */
export const removeAppFromListCache = (
  old: AppListCache | undefined,
  appId: number,
): AppListCache | undefined =>
  old
    ? {
        ...old,
        data: (old.data ?? []).filter((app) => app.id !== appId),
      }
    : old;

/** Apply an update only to an existing detail cache entry. */
export const updateAppDetailCache = (
  old: App | undefined,
  params: Partial<App>,
): App | undefined => (old ? { ...old, ...params } : old);

/** Apply an update only to an existing list cache entry. */
export const updateAppInListCache = (
  old: AppListCache | undefined,
  appId: number,
  params: Partial<App>,
): AppListCache | undefined =>
  old
    ? {
        ...old,
        data: (old.data ?? []).map((app) =>
          app.id === appId ? { ...app, ...params } : app,
        ),
      }
    : old;
