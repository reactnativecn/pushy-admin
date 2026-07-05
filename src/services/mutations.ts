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

type UpdateAppParams = Omit<App, 'appKey' | 'checkCount' | 'id' | 'platform'>;

type UpdatePackageParams = {
  note?: string;
  status?: Package['status'];
  versionId?: number | null;
};

// --- cache updaters (single place that knows the cache shapes) ---

const removeAppFromList = (appId: number) => {
  queryClient.setQueryData(
    appKeys.list(),
    (old?: { data?: App[] } | undefined) => ({
      data: old?.data?.filter((i) => i.id !== appId) ?? [],
    }),
  );
};

const addAppToList = (app: { id: number; name: string; platform: string }) => {
  queryClient.setQueryData(
    appKeys.list(),
    (old?: { data?: App[] } | undefined) => ({
      data: [...(old?.data || []), app],
    }),
  );
};

const applyAppUpdate = (appId: number, params: UpdateAppParams) => {
  queryClient.setQueryData(appKeys.detail(appId), (old: App | undefined) => ({
    ...old,
    ...params,
  }));
  queryClient.setQueryData(
    appKeys.list(),
    (old?: { data?: App[] } | undefined) => ({
      data:
        old?.data?.map((i) => (i.id === appId ? { ...i, ...params } : i)) ?? [],
    }),
  );
};

const applyPackageUpdate = (
  appId: number,
  packageId: number,
  params: UpdatePackageParams,
) => {
  queryClient.setQueryData(
    packageKeys.byApp(appId),
    (old?: { data: Package[] }) =>
      old
        ? {
            ...old,
            data: old.data?.map((i) =>
              i.id === packageId ? { ...i, ...params } : i,
            ),
          }
        : old,
  );
  if (params.versionId !== undefined) {
    queryClient.invalidateQueries({ queryKey: versionKeys.byApp(appId) });
  }
};

const removePackagesFromList = (appId: number, packageIds: number[]) => {
  const packageIdSet = new Set(packageIds);
  queryClient.setQueryData(
    packageKeys.byApp(appId),
    (old?: { data: Package[] }) =>
      old
        ? { ...old, data: old.data?.filter((i) => !packageIdSet.has(i.id)) }
        : old,
  );
};

const applyVersionUpdate = (
  appId: number,
  versionId: number,
  params: Partial<Omit<Version, 'id' | 'packages'>>,
) => {
  queryClient.setQueriesData(
    { queryKey: versionKeys.byApp(appId) },
    (old?: { data: Version[]; count?: number }) =>
      old
        ? {
            ...old,
            data: old.data?.map((i) =>
              i.id === versionId ? { ...i, ...params } : i,
            ),
          }
        : undefined,
  );
};

const removeVersionsFromList = (
  appId: number,
  versionIds: number[],
  deletedCount: number,
) => {
  const versionIdSet = new Set(versionIds);
  queryClient.setQueriesData(
    { queryKey: versionKeys.byApp(appId) },
    (old?: { data: Version[]; count?: number }) =>
      old
        ? {
            ...old,
            data: old.data?.filter((i) => !versionIdSet.has(i.id)),
            count: Math.max((old.count ?? old.data.length) - deletedCount, 0),
          }
        : undefined,
  );
};

const invalidateBindings = (appId: number) => {
  queryClient.invalidateQueries({ queryKey: bindingKeys.byApp(appId) });
};

const removeBindingFromList = (appId: number, bindingId: number) => {
  queryClient.setQueriesData(
    { queryKey: bindingKeys.byApp(appId) },
    (old?: { data: Binding[] }) =>
      old
        ? { ...old, data: old.data?.filter((i) => i.id !== bindingId) }
        : undefined,
  );
};

// --- imperative helpers (for non-component call sites like Modal.confirm factories) ---

export const createApp = async (params: { name: string; platform: string }) => {
  const id = await api.createApp(params);
  addAppToList({ ...params, id });
  return id;
};

// --- mutation hooks ---

export const useDeleteApp = () =>
  useMutation({
    mutationFn: (appId: number) => api.deleteApp(appId),
    onSuccess: (_data, appId) => removeAppFromList(appId),
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
    onSuccess: (_data, { appId, params }) => applyAppUpdate(appId, params),
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
