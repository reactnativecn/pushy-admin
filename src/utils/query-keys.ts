export const versionKeys = {
  byApp: (appId: number) => ['versions', appId] as const,
  page: (appId: number, offset: number, limit: number) =>
    ['versions', appId, 'page', offset, limit] as const,
  all: (appId: number) => ['versions', appId, 'all'] as const,
};

export const appKeys = {
  list: () => ['appList'] as const,
  detail: (appId: number) => ['app', appId] as const,
};

export const packageKeys = {
  byApp: (appId: number) => ['packages', appId] as const,
};

export const bindingKeys = {
  byApp: (appId: number) => ['bindings', appId] as const,
};

export const userKeys = {
  info: () => ['userInfo'] as const,
  orderBillingConfig: () => ['orderBillingConfig'] as const,
  orderQuotes: (parts: ReadonlyArray<string | number | undefined>) =>
    ['orderQuotes', ...parts] as const,
  accountQuotaVersions: (appId: number) =>
    ['accountQuotaVersions', appId] as const,
  accountQuotaPackages: (appId: number) =>
    ['accountQuotaPackages', appId] as const,
};

export const auditKeys = {
  all: () => ['auditLogs'] as const,
};

export const apiTokenKeys = {
  all: () => ['apiTokens'] as const,
};

export const activateKeys = {
  byToken: (token: string | null) => ['activate', token] as const,
};

export const metricsKeys = {
  global: (startDate: string, endDate: string, mode: 'pv' | 'uv') =>
    ['globalMetrics', startDate, endDate, mode] as const,
  internal: (target: string) => ['internalMetrics', target] as const,
  internalApi5xxEvents: (target: string, offset: number) =>
    ['internalApi5xxEvents', target, offset] as const,
};

export const adminKeys = {
  users: (searchQuery?: string) =>
    searchQuery === undefined
      ? (['adminUsers'] as const)
      : (['adminUsers', searchQuery] as const),
  userDetail: (userId: number | null) => ['adminUserDetail', userId] as const,
  apps: (searchQuery?: string, page?: number, pageSize?: number) =>
    searchQuery === undefined
      ? (['adminApps'] as const)
      : (['adminApps', searchQuery, page, pageSize] as const),
  config: () => ['adminConfig'] as const,
};
