import type {
  AccountMember,
  ApiToken,
  App,
  AuditLog,
  Binding,
  BindingDiffStatus,
  MemberRole,
  Package,
  Quota,
  User,
  Version,
  Workspace,
} from '@/types';
import request from './request';

type BindingRequest = {
  versionId: number;
  packageId: number;
  rollout?: number | null;
  config?: Record<string, any>;
};

type UpsertBindingsParams = { appId: number } & (
  | {
      versionId: number;
      packageIds: number[];
      rollout?: number | null;
      config?: Record<string, any>;
    }
  | {
      bindings: BindingRequest[];
    }
);

type BillingProduct = {
  price: number;
  title: string;
  summary: string;
};

type BillingTier = {
  key: string;
  product: BillingProduct;
  quota: Quota | null;
  annualPrice: number;
  monthlyPrice: number;
};

type CheckUpdateAddon = {
  annualPrice: number;
  eligibilityMessage?: string;
  minTier?: string;
  monthlyUnitPrice: number;
  quota: number;
  summary: string;
  targetTier: string;
  title: string;
};

type OrderQuote = {
  amount: number;
  billing?: {
    annualPrice: number;
    billingCycle: 'month' | 'year';
    billingMonths: number;
    monthlyPrice: number;
    requestedMonths: number;
    switchedToAnnual: boolean;
  };
  proration?: {
    amount: number;
    annualAmount?: number;
    annualDelta?: number;
    dailyAmount: number;
    days: number;
    mode: 'month' | 'year';
    monthlyDelta?: number;
    thresholdMonths?: number;
  };
  tier: string;
  type: 'buy' | 'upgrade';
};

type OrderQuoteOption = {
  checkUpdateAddonUnits?: number;
  key: string;
  months?: number;
  quote: OrderQuote;
  tier?: string;
};

type OrderQuotes = {
  checkUpdateAddons: OrderQuoteOption[];
  current: {
    checkUpdateAddonMonthlyPrice: number;
    checkUpdateAddonUnits: number;
  };
  renewals: OrderQuoteOption[];
  upgrades: OrderQuoteOption[];
};

export type InternalMetricCounter = {
  labels: Record<string, string>;
  name: string;
  value: number;
};

export type InternalMetricDuration = {
  avgMs: number;
  buckets: Record<string, number>;
  count: number;
  labels: Record<string, string>;
  maxMs: number;
  minMs: number;
  name: string;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  totalMs: number;
};

export type InternalMetricsBucket = {
  counters: InternalMetricCounter[];
  durations: InternalMetricDuration[];
  end: string;
  start: string;
};

export type InternalMetricsResponse = {
  buckets?: InternalMetricsBucket[];
  config: {
    bucketCount: number;
    bucketMs: number;
    durationBucketsMs: number[];
  };
  counters: InternalMetricCounter[];
  durations: InternalMetricDuration[];
  generatedAt: string;
  process: {
    memory: {
      arrayBuffers: number;
      external: number;
      heapTotal: number;
      heapUsed: number;
      rss: number;
    };
    pid: number;
    uptimeSeconds: number;
  };
};

export type InternalApi5xxEvent = {
  durationMs: number;
  errorCode?: string;
  errorName?: string;
  hostname: string;
  id: number;
  message?: string;
  method: string;
  path: string;
  pid: number;
  requestId?: string;
  statusCode: number;
  time: string;
};

export type InternalApi5xxEventsResponse = {
  capacity: number;
  data: InternalApi5xxEvent[];
  generatedAt: string;
  hasMore: boolean;
  limit: number;
  log?: {
    ignored: number;
    parseErrors: number;
    paths: string[];
    readBytes: number;
  };
  offset: number;
  total: number;
};

export const api = {
  login: (params: { email: string; pwd: string }) =>
    request<{ token?: string }>('post', '/user/login', params, {
      suppressErrorToast: true,
    }),
  logout: () =>
    request('post', '/user/logout', undefined, { suppressErrorToast: true }),
  activate: (params: { token: string }) =>
    request('post', '/user/activate', params),
  me: () => request<User>('get', '/user/me'),
  sendEmail: (params: { email: string }) =>
    request('post', '/user/activate/sendmail', params),
  resetpwdSendMail: (params: { email: string }) =>
    request('post', '/user/resetpwd/sendmail', params),
  register: (params: { [key: string]: string }) =>
    request('post', '/user/register', params),
  resetPwd: (params: { token: string; newPwd: string }) =>
    request('post', '/user/resetpwd/reset', params),
  requestEmailChange: (params: { newEmail: string; pwd: string }) =>
    request<{ message: string }>('post', '/user/email/change-request', params, {
      suppressErrorToast: true,
    }),
  confirmEmailChange: (params: { token: string }) =>
    request<{ token: string; userId: number }>(
      'post',
      '/user/email/confirm',
      params,
      { suppressErrorToast: true },
    ),
  revertEmailChange: (params: { token: string }) =>
    request<{ userId: number }>('post', '/user/email/revert', params, {
      suppressErrorToast: true,
    }),
  changePassword: (params: { currentPwd: string; newPwd: string }) =>
    request<{ token: string; userId: number }>(
      'post',
      '/user/password/change',
      params,
      { suppressErrorToast: true },
    ),
  // app
  appList: () => request<{ data: App[] }>('get', '/app/list'),
  getApp: (appId: number) => request<App>('get', `/app/${appId}`),
  deleteApp: (appId: number) => request('delete', `/app/${appId}`),
  createApp: (params: { name: string; platform: string }) =>
    request<{ id: number }>('post', '/app/create', params).then((response) => {
      if (!response) throw Error('Failed to create app');
      return response.id;
    }),
  updateApp: (
    appId: number,
    params: Omit<App, 'appKey' | 'checkCount' | 'id' | 'platform'>,
  ) => request('put', `/app/${appId}`, params),
  // package
  getPackages: (appId: number) =>
    request<{ data: Package[]; count: number }>(
      'get',
      `/app/${appId}/package/list?limit=1000`,
    ),
  updatePackage: ({
    appId,
    packageId,
    params,
  }: {
    appId: number;
    packageId: number;
    params: {
      note?: string;
      status?: Package['status'];
      versionId?: number | null;
    };
  }) => request('put', `/app/${appId}/package/${packageId}`, params),
  deletePackage: ({ appId, packageId }: { appId: number; packageId: number }) =>
    request('delete', `/app/${appId}/package/${packageId}`),
  deletePackages: ({
    appId,
    packageIds,
  }: {
    appId: number;
    packageIds: number[];
  }) => request('delete', `/app/${appId}/package`, { packageIds }),
  // version
  getVersions: ({
    appId,
    offset = 0,
    limit = 1000,
  }: {
    appId: number;
    offset?: number;
    limit?: number;
  }) =>
    request<{ data: Version[]; count: number }>(
      'get',
      `/app/${appId}/version/list?offset=${offset}&limit=${limit}`,
    ),
  updateVersion: ({
    versionId,
    appId,
    params,
  }: {
    versionId: number;
    appId: number;
    params: Partial<Omit<Version, 'id' | 'packages'>>;
  }) => request('put', `/app/${appId}/version/${versionId}`, params),
  deleteVersion: ({ appId, versionId }: { appId: number; versionId: number }) =>
    request('delete', `/app/${appId}/version/${versionId}`),
  deleteVersions: ({
    appId,
    versionIds,
  }: {
    appId: number;
    versionIds: number[];
  }) =>
    request<{ count: number }>('delete', `/app/${appId}/version`, {
      versionIds,
    }),
  // order
  getOrderBillingConfig: () =>
    request<{
      annualBillingMonths: number;
      checkUpdateAddon?: CheckUpdateAddon;
      monthlyPriceFactor: number;
      tiers: BillingTier[];
    }>('get', '/orders/billing', undefined, { suppressErrorToast: true }),
  createOrder: (params: {
    checkUpdateAddonUnits?: number;
    months?: number;
    tier?: string;
  }) =>
    request<{
      amount?: number | string;
      billing?: {
        annualPrice: number;
        billingCycle: 'month' | 'year';
        billingMonths: number;
        monthlyPrice: number;
        requestedMonths: number;
        switchedToAnnual: boolean;
      };
      payUrl: string;
    }>('post', '/orders', params),
  getOrderQuotes: () =>
    request<OrderQuotes>('get', '/orders/quote', undefined, {
      suppressErrorToast: true,
    }),
  // binding
  getBinding: (appId: number) =>
    request<{ data: Binding[] }>('get', `/app/${appId}/binding`),
  upsertBinding: ({
    appId,
    versionId,
    packageId,
    rollout,
    config,
  }: {
    appId: number;
    versionId: number;
    packageId: number;
    rollout?: number | null;
    config?: Record<string, any>;
  }) =>
    request('post', `/app/${appId}/binding/`, {
      versionId,
      rollout,
      config,
      packageId,
    }),
  upsertBindings: ({ appId, ...params }: UpsertBindingsParams) =>
    request('post', `/app/${appId}/binding/`, params),
  deleteBinding: ({ appId, bindingId }: { appId: number; bindingId: number }) =>
    request('delete', `/app/${appId}/binding/${bindingId}`),
  // 补丁生成状态；旧版服务端没有该端点，404 时静默降级为不显示
  getDiffStatus: (appId: number) =>
    request<{ data: BindingDiffStatus[] }>(
      'get',
      `/app/${appId}/binding/diffStatus`,
      undefined,
      { suppressErrorToast: true },
    ),
  // audit logs
  getAuditLogs: ({
    offset = 0,
    limit = 20,
    startDate,
  }: {
    offset?: number;
    limit?: number;
    startDate?: string;
  }) =>
    request<{ data: AuditLog[]; count: number }>(
      'get',
      `/audit/logs?offset=${offset}&limit=${limit}&startDate=${startDate}`,
    ),
  // global metrics
  getGlobalMetrics: (params: {
    start: string;
    end: string;
    mode?: 'pv' | 'uv';
  }) =>
    request<{
      dict: string[];
      data: Array<{ time: string; data: Array<[number, number]> }>;
    }>(
      'get',
      `/metrics/global?start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}&mode=${params.mode || 'pv'}`,
    ),
  getAppMetrics: (params: { appKey: string; start: string; end: string }) =>
    request<{
      dict: string[];
      data: Array<{ time: string; data: Array<[number, number]> }>;
    }>(
      'get',
      `/metrics/app?appKey=${encodeURIComponent(params.appKey)}&start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`,
    ),
  // 客户端热更生命周期事件(版本健康度),dict 项形如 `${type}${版本名}`
  getAppEventsMetrics: (params: {
    appKey: string;
    start: string;
    end: string;
  }) =>
    request<{
      dict: string[];
      data: Array<{ time: string; data: Array<[number, number]> }>;
    }>(
      'get',
      `/metrics/app/events?appKey=${encodeURIComponent(params.appKey)}&start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`,
    ),
  getAppEventsDaily: (params: { appKey: string; start: string; end: string }) =>
    request<{
      rows: Array<{
        date: string;
        hash: string;
        name: string | null;
        packageVersion: string;
        type: string;
        count: number;
      }>;
    }>(
      'get',
      `/metrics/app/events/daily?appKey=${encodeURIComponent(params.appKey)}&start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`,
    ),
  getInternalMetrics: (params?: {
    baseUrl?: string;
    suppressErrorToast?: boolean;
  }) =>
    request<InternalMetricsResponse>('get', '/metrics/internal', undefined, {
      baseUrl: params?.baseUrl,
      suppressErrorToast: params?.suppressErrorToast,
    }),
  getInternalApi5xxEvents: (params?: {
    baseUrl?: string;
    limit?: number;
    offset?: number;
    suppressErrorToast?: boolean;
  }) => {
    const query: Record<string, number> = {};
    if (params?.offset !== undefined) {
      query.offset = params.offset;
    }
    if (params?.limit !== undefined) {
      query.limit = params.limit;
    }
    return request<InternalApi5xxEventsResponse>(
      'get',
      '/metrics/internal/5xx-events',
      Object.keys(query).length > 0 ? query : undefined,
      {
        baseUrl: params?.baseUrl,
        suppressErrorToast: params?.suppressErrorToast,
      },
    );
  },
  // members / workspaces
  listMembers: () =>
    request<{ data: AccountMember[] }>('get', '/member/list', undefined, {
      suppressErrorToast: true,
    }),
  inviteMember: (params: {
    email: string;
    role: MemberRole;
    appIds?: number[] | null;
  }) => request<{ id: number }>('post', '/member/invite', params),
  updateMember: (
    id: number,
    params: { role?: MemberRole; appIds?: number[] | null },
  ) => request('put', `/member/${id}`, params),
  removeMember: (id: number) => request('delete', `/member/${id}`),
  listWorkspaces: () =>
    request<{ data: Workspace[] }>('get', '/member/workspaces', undefined, {
      suppressErrorToast: true,
    }),
  acceptInvite: (accountId: number) =>
    request('post', '/member/accept', { accountId }),
  leaveWorkspace: (accountId: number) =>
    request('post', '/member/leave', { accountId }),
  // API Token
  createApiToken: (params: {
    name: string;
    permissions?: { read?: boolean; write?: boolean; delete?: boolean };
    scopes?: string[];
    appIds?: number[];
    expiresAt?: string;
  }) => request<ApiToken>('post', '/api-token/create', params),
  listApiTokens: () => request<{ data: ApiToken[] }>('get', '/api-token/list'),
  revokeApiToken: (tokenId: number) =>
    request<{ message: string }>('delete', `/api-token/${tokenId}`),
};
