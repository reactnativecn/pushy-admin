import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type AppDrawerItem,
  useAppWorkspaceList,
} from '@/components/app-drawer';
import { patchSearchParams, rememberRecentApp } from '@/utils/helper';

/**
 * 以 URL 里的 appKey 为准的应用选择：指标页、健康度页共用。
 * 管理员可以看任意 appKey（排查别人的应用），普通用户只认自己列表里的；
 * 没带 appKey 进来时默认选第一个并回写 URL，这样刷新和分享链接都稳定。
 */
export const useSelectedAppFromUrl = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    apps: selectableApps,
    isAdmin,
    isLoading: isLoadingApps,
  } = useAppWorkspaceList();
  const urlAppKey = searchParams.get('appKey') || undefined;
  const selectableAppKeys = selectableApps
    .map((app) => app.appKey)
    .filter((appKey): appKey is string => Boolean(appKey));
  const selectedAppKey =
    urlAppKey && (isAdmin || selectableAppKeys.includes(urlAppKey))
      ? urlAppKey
      : undefined;
  const selectedApp = selectedAppKey
    ? selectableApps.find((app) => app.appKey === selectedAppKey)
    : undefined;

  const firstAppKey = selectableAppKeys[0];
  useEffect(() => {
    if (!urlAppKey && firstAppKey) {
      patchSearchParams(setSearchParams, { appKey: firstAppKey });
    }
  }, [firstAppKey, setSearchParams, urlAppKey]);

  const selectApp = (app: AppDrawerItem) => {
    if (!app.appKey) {
      return;
    }
    rememberRecentApp(app.id);
    patchSearchParams(setSearchParams, { appKey: app.appKey });
  };

  return {
    selectableApps,
    isAdmin,
    isLoadingApps,
    selectedAppKey,
    selectedApp,
    selectApp,
  };
};
