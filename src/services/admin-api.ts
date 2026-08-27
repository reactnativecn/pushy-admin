import type {
  AdminApp,
  AdminUser,
  AdminVersion,
  Quota,
  SystemDeployStatus,
  SystemInstance,
  SystemNpmInfo,
} from '@/types';
import type { InternalMetricsResponse } from './api';
import request from './request';

export type NodeTelemetrySnapshot = {
  version: number;
  nodeId: string;
  hostname: string;
  publishedAt: string;
  metrics: InternalMetricsResponse;
  instances: SystemInstance[];
  deployStatuses: Record<string, SystemDeployStatus>;
};

export type NodeTelemetryBatch = {
  data: Array<{
    nodeId: string;
    snapshot: NodeTelemetrySnapshot | null;
  }>;
  generatedAt: string;
};

export const adminApi = {
  getWorkerTaskStats: (days = 7) =>
    request<{ data: WorkerTaskDaySummary[] }>(
      'get',
      `/admin/system/worker/stats?days=${days}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getAnalyticsOverview: (days = 7) =>
    request<{ data: GlobalAnalyticsDay[] }>(
      'get',
      `/admin/analytics/overview?days=${days}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getQuotaAlerts: () =>
    request<{
      data: { alerts: QuotaAlert[]; generatedAt: string | null } | null;
    }>('get', '/admin/analytics/quota-alerts', undefined, {
      suppressErrorToast: true,
    }),
  getGrowthStats: (days = 30) =>
    request<{ data: GrowthDay[] }>(
      'get',
      `/admin/analytics/growth?days=${days}`,
      undefined,
      { suppressErrorToast: true },
    ),
  getVersionHealthOverview: (days = 7) =>
    request<{ data: VersionHealthOverviewRow[] }>(
      'get',
      `/admin/analytics/version-health?days=${days}`,
      undefined,
      { suppressErrorToast: true },
    ),
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
  searchUsers: (params?: {
    search?: string;
    status?: string;
    tier?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.tier) queryParams.set('tier', params.tier);
    if (params?.orderBy) queryParams.set('orderBy', params.orderBy);
    if (params?.order) queryParams.set('order', params.order);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset !== undefined)
      queryParams.set('offset', String(params.offset));
    const query = queryParams.toString();
    return request<{ data: AdminUser[]; count: number }>(
      'get',
      query ? `/admin/users?${query}` : '/admin/users',
    );
  },
  deleteUser: (id: number) =>
    request<{ id: number; email: string; appCount: number; deleted: boolean }>(
      'delete',
      `/admin/users/${id}`,
    ),
  bulkDeleteDormant: (params: {
    minDormantDays: number;
    limit?: number;
    dryRun: boolean;
  }) =>
    request<{
      dryRun: boolean;
      minDormantDays: number;
      limit?: number;
      matched?: number;
      sample?: Array<{
        id: number;
        email: string;
        dormantMarkedAt: string | null;
      }>;
      deleted?: number;
      failed?: number;
      deletedEmails?: string[];
    }>('post', '/admin/users/dormant/bulk-delete', params),
  updateUser: (id: number, data: Partial<AdminUser>) =>
    request<AdminUser>('put', `/admin/users/${id}`, data),
  // admin app management
  searchApps: (
    params?:
      | string
      | {
          search?: string;
          platform?: string;
          status?: string;
          userId?: number;
          orderBy?: string;
          order?: 'asc' | 'desc';
          limit?: number;
          offset?: number;
        },
  ) => {
    const normalizedParams =
      typeof params === 'string' ? { search: params } : params;
    const queryParams = new URLSearchParams();
    if (normalizedParams?.search) {
      queryParams.set('search', normalizedParams.search);
    }
    if (normalizedParams?.platform) {
      queryParams.set('platform', normalizedParams.platform);
    }
    if (normalizedParams?.status) {
      queryParams.set('status', normalizedParams.status);
    }
    if (normalizedParams?.userId) {
      queryParams.set('userId', String(normalizedParams.userId));
    }
    if (normalizedParams?.orderBy) {
      queryParams.set('orderBy', normalizedParams.orderBy);
    }
    if (normalizedParams?.order) {
      queryParams.set('order', normalizedParams.order);
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
      user: AdminUser & { createdAt: string; updatedAt: string };
      activity: {
        lastOperationAt: string | null;
        dormantMarkedAt: string | null;
      };
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
        }
      >;
    }>('get', `/admin/users/${id}`),
  getAppPackages: (appId: number) =>
    request<{
      data: Array<{
        id: number;
        name: string;
        hash: string;
        status: string;
        buildTime: string | null;
        note: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('get', `/admin/apps/${appId}/packages`),
  // admin system deploy
  getSystemInstances: (baseUrl?: string) =>
    request<{
      data: SystemInstance[];
      deployStatuses: Record<string, SystemDeployStatus>;
    }>('get', '/admin/system/instances', undefined, {
      baseUrl,
      suppressErrorToast: true,
    }),
  getNodeSnapshots: (nodeIds: string[], baseUrl?: string) =>
    request<NodeTelemetryBatch>(
      'get',
      `/admin/system/node-snapshots?nodes=${encodeURIComponent(nodeIds.join(','))}`,
      undefined,
      { baseUrl, suppressErrorToast: true },
    ),
  getSystemNpmInfo: (baseUrl?: string) =>
    request<SystemNpmInfo>('get', '/admin/system/npm', undefined, {
      baseUrl,
      suppressErrorToast: true,
    }),
  restartInstance: ({
    instanceId,
    baseUrl,
  }: {
    instanceId: string;
    baseUrl?: string;
  }) =>
    request<{ queued: boolean }>(
      'post',
      `/admin/system/instances/${encodeURIComponent(instanceId)}/command`,
      { action: 'restart' },
      { baseUrl },
    ),
  // 更新/回滚是节点级操作:全局安装一次,本机所有进程滚动重启
  updateNode: ({ version, baseUrl }: { version: string; baseUrl?: string }) =>
    request<{ queued: boolean }>(
      'post',
      '/admin/system/update',
      { version },
      { baseUrl },
    ),
};
