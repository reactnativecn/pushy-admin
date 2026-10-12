import { useMutation } from '@tanstack/react-query';
import type { App, Binding, Package, Version } from '@/types';
import {
  appKeys,
  bindingKeys,
  packageKeys,
  versionKeys,
} from '@/utils/query-keys';
import { queryClient } from '@/utils/queryClient';
import { api } from './api';
import {
  type AppListCache,
  type ListCache,
  removeItemsFromList,
  updateAppDetailCache,
  updateItemInList,
} from './mutation-cache';

type UpdateAppParams = Omit<App, 'appKey' | 'checkCount' | 'id' | 'platform'>;

type UpdatePackageParams = {
  note?: string;
  status?: Package['status'];
  versionId?: number | null;
};

type VersionListCache = ListCache<Version> & { count?: number };

// --- cache updaters (single place that knows the cache shapes) ---

const removeAppFromList = (appId: number) => {
  queryClient.setQueryData(appKeys.list(), (old?: AppListCache) =>
    removeItemsFromList(old, [appId]),
  );
  queryClient.removeQueries({ queryKey: appKeys.detail(appId), exact: true });
};

const applyAppUpdate = (appId: number, params: UpdateAppParams) => {
  queryClient.setQueryData(appKeys.detail(appId), (old: App | undefined) =>
    updateAppDetailCache(old, params),
  );
  queryClient.setQueryData(appKeys.list(), (old?: AppListCache) =>
    updateItemInList(old, appId, params),
  );
};

const revalidateAppList = () =>
  queryClient.invalidateQueries({ queryKey: appKeys.list() });

const applyPackageUpdate = (
  appId: number,
  packageId: number,
  params: UpdatePackageParams,
) => {
  queryClient.setQueryData(
    packageKeys.byApp(appId),
    (old?: ListCache<Package>) => updateItemInList(old, packageId, params),
  );
  if (params.versionId !== undefined) {
    queryClient.invalidateQueries({ queryKey: versionKeys.byApp(appId) });
    queryClient.invalidateQueries({ queryKey: bindingKeys.diffStatus(appId) });
  }
};

const removePackagesFromList = (appId: number, packageIds: number[]) => {
  queryClient.setQueryData(
    packageKeys.byApp(appId),
    (old?: ListCache<Package>) => removeItemsFromList(old, packageIds),
  );
};

const applyVersionUpdate = (
  appId: number,
  versionId: number,
  params: Partial<Omit<Version, 'id' | 'packages'>>,
) => {
  queryClient.setQueriesData(
    { queryKey: versionKeys.byApp(appId) },
    (old?: VersionListCache) => updateItemInList(old, versionId, params),
  );
};

const removeVersionsFromList = (
  appId: number,
  versionIds: number[],
  deletedCount: number,
) => {
  queryClient.setQueriesData(
    { queryKey: versionKeys.byApp(appId) },
    (old?: VersionListCache) => {
      const next = removeItemsFromList(old, versionIds);
      return next
        ? {
            ...next,
            count: Math.max(
              (next.count ?? old?.data?.length ?? 0) - deletedCount,
              0,
            ),
          }
        : next;
    },
  );
};

const invalidateDiffStatus = (appId: number) => {
  queryClient.invalidateQueries({ queryKey: bindingKeys.diffStatus(appId) });
};

const invalidateBindings = (appId: number) => {
  queryClient.invalidateQueries({ queryKey: bindingKeys.byApp(appId) });
  invalidateDiffStatus(appId);
};

const removeBindingFromList = (appId: number, bindingId: number) => {
  queryClient.setQueriesData(
    { queryKey: bindingKeys.byApp(appId) },
    (old?: ListCache<Binding>) => removeItemsFromList(old, [bindingId]),
  );
  invalidateDiffStatus(appId);
};

// --- imperative helpers (for non-component call sites like Modal.confirm factories) ---

export const createApp = async (params: { name: string; platform: string }) => {
  const id = await api.createApp(params);
  // The create endpoint returns only an id. Refetch the canonical entity list
  // instead of inserting an object without appKey/status into a fresh cache.
  await revalidateAppList();
  return id;
};

// --- mutation hooks ---

export const useDeleteApp = () =>
  useMutation({
    mutationFn: (appId: number) => api.deleteApp(appId),
    onSuccess: async (_data, appId) => {
      removeAppFromList(appId);
      await revalidateAppList();
    },
  });

export const useUpdateApp = () =>
  useMutation({
    mutationFn: ({
      appId,
      params,
    }: {
      appId: number;
      params: UpdateAppParams;
    }) => api.updateApp(appId, params),
    onSuccess: async (_data, { appId, params }) => {
      applyAppUpdate(appId, params);
      await Promise.all([
        revalidateAppList(),
        queryClient.invalidateQueries({ queryKey: appKeys.detail(appId) }),
      ]);
    },
  });

export const useUpdatePackage = () =>
  useMutation({
    mutationFn: (variables: {
      appId: number;
      packageId: number;
      params: UpdatePackageParams;
    }) => api.updatePackage(variables),
    onSuccess: (_data, { appId, packageId, params }) =>
      applyPackageUpdate(appId, packageId, params),
  });

export const useDeletePackage = () =>
  useMutation({
    mutationFn: (variables: { appId: number; packageId: number }) =>
      api.deletePackage(variables),
    onSuccess: (_data, { appId, packageId }) =>
      removePackagesFromList(appId, [packageId]),
  });

export const useDeletePackages = () =>
  useMutation({
    mutationFn: (variables: { appId: number; packageIds: number[] }) =>
      api.deletePackages(variables),
    onSuccess: (_data, { appId, packageIds }) =>
      removePackagesFromList(appId, packageIds),
  });

export const useUpdateVersion = () =>
  useMutation({
    mutationFn: (variables: {
      appId: number;
      versionId: number;
      params: Partial<Omit<Version, 'id' | 'packages'>>;
    }) => api.updateVersion(variables),
    onSuccess: (_data, { appId, versionId, params }) =>
      applyVersionUpdate(appId, versionId, params),
  });

export const useDeleteVersions = () =>
  useMutation({
    mutationFn: (variables: { appId: number; versionIds: number[] }) =>
      api.deleteVersions(variables),
    onSuccess: (data, { appId, versionIds }) =>
      removeVersionsFromList(
        appId,
        versionIds,
        data?.count ?? versionIds.length,
      ),
  });

export const useUpsertBinding = () =>
  useMutation({
    mutationFn: (variables: {
      appId: number;
      versionId: number;
      packageId: number;
      rollout?: number | null;
      config?: Record<string, unknown>;
    }) => api.upsertBinding(variables),
    onSuccess: (_data, { appId }) => invalidateBindings(appId),
  });

export const useUpsertBindings = () =>
  useMutation({
    mutationFn: (variables: Parameters<typeof api.upsertBindings>[0]) =>
      api.upsertBindings(variables),
    onSuccess: (_data, { appId }) => invalidateBindings(appId),
  });

export const useDeleteBinding = () =>
  useMutation({
    mutationFn: (variables: { appId: number; bindingId: number }) =>
      api.deleteBinding(variables),
    onSuccess: (_data, { appId, bindingId }) =>
      removeBindingFromList(appId, bindingId),
  });
