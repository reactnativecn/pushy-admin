import type {
  AdminApp,
  AdminUser,
  AdminVersion,
  Quota,
  SystemDeployStatus,
  SystemInstance,
  SystemNpmInfo,
} from '@/types';
import request from './request';

export const adminApi = {
  // admin config
  getConfig: () =>
    request<{ data?: Record<string, string> }>('get', `/admin/config`),
  setConfig: (key: string, value: string) =>
    request<{ key: string; value: string }>('post', '/admin/config', {
      key,
      value,
    }),
  deleteConfig: (key: string) => request('delete', `/admin/config/${key}`),
  // admin user management
  searchUsers: (search?: string) =>
    request<{ data: AdminUser[] }>(
      'get',
      search
        ? `/admin/users?search=${encodeURIComponent(search)}`
        : '/admin/users',
    ),
  updateUser: (id: number, data: Partial<AdminUser>) =>
    request<AdminUser>('put', `/admin/users/${id}`, data),
  // admin app management
  searchApps: (
    params?: string | { search?: string; limit?: number; offset?: number },
  ) => {
    const normalizedParams =
      typeof params === 'string' ? { search: params } : params;
    const queryParams = new URLSearchParams();
    if (normalizedParams?.search) {
      queryParams.set('search', normalizedParams.search);
    }
    if (normalizedParams?.limit) {
      queryParams.set('limit', String(normalizedParams.limit));
    }
    if (normalizedParams?.offset) {
      queryParams.set('offset', String(normalizedParams.offset));
    }
    const query = queryParams.toString();
    return request<{ data: AdminApp[]; count: number }>(
      'get',
      query ? `/admin/apps?${query}` : '/admin/apps',
    );
  },
  // admin version management
  searchVersions: (params?: { search?: string; appId?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.appId) queryParams.set('appId', String(params.appId));
    const query = queryParams.toString();
    return request<{ data: AdminVersion[] }>(
      'get',
      query ? `/admin/versions?${query}` : '/admin/versions',
    );
  },
  updateVersion: (id: number, data: Partial<AdminVersion>) =>
    request<AdminVersion>('put', `/admin/versions/${id}`, data),
  updateApp: (id: number, data: Partial<AdminApp>) =>
    request<AdminApp>('put', `/admin/apps/${id}`, data),
  getUserDetail: (id: number) =>
    request<{
      user: AdminUser;
      quotaDetail: {
        limit: Quota;
        todayRemaining: number;
        todayUsed: number;
        last7Days: {
          counts: number[];
          avg: number;
        };
      };
      apps: Array<
        AdminApp & {
          checkCount: number;
          packagesCount: number;
          packages: Array<{
            id: number;
            name: string;
            hash: string;
            status: string;
            buildTime: string | null;
            buildNumber: string | null;
            note: string | null;
            createdAt: string;
            updatedAt: string;
          }>;
        }
      >;
    }>('get', `/admin/users/${id}`),
  // admin system deploy
  getSystemInstances: (baseUrl?: string) =>
    request<{
      data: SystemInstance[];
      deployStatuses: Record<string, SystemDeployStatus>;
    }>('get', '/admin/system/instances', undefined, {
      baseUrl,
      suppressErrorToast: true,
    }),
  getSystemNpmInfo: (baseUrl?: string) =>
    request<SystemNpmInfo>('get', '/admin/system/npm', undefined, {
      baseUrl,
      suppressErrorToast: true,
    }),
  sendInstanceCommand: ({
    instanceId,
    action,
    version,
    baseUrl,
  }: {
    instanceId: string;
    action: 'restart' | 'update';
    version?: string;
    baseUrl?: string;
  }) =>
    request<{ queued: boolean }>(
      'post',
      `/admin/system/instances/${encodeURIComponent(instanceId)}/command`,
      { action, version },
      { baseUrl },
    ),
};
