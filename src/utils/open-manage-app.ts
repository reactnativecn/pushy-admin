import { rootRouterPath, router } from '@/router';
import { rememberRecentApp } from '@/utils/app-preferences';

/** 进入某个应用的管理页，并记入最近访问（应用切换器按这个排序） */
export const openManageApp = (appId: number) => {
  rememberRecentApp(appId);
  return router.navigate(rootRouterPath.versions(String(appId)));
};
