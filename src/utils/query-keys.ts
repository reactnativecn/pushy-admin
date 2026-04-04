export const versionKeys = {
  byApp: (appId: number) => ['versions', appId] as const,
  page: (appId: number, offset: number, limit: number) =>
    ['versions', appId, 'page', offset, limit] as const,
  all: (appId: number) => ['versions', appId, 'all'] as const,
};
