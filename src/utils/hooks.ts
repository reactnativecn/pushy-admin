import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api } from '@/services/api';
import { getToken } from '@/services/request';
import 'dayjs/locale/zh-cn';
import { useEffect, useMemo, useState } from 'react';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);

const METRIC_CATEGORY_SEPARATOR = '\u001f';
const PACKAGE_METRIC_PREFIX = `packageVersion_buildTime${METRIC_CATEGORY_SEPARATOR}`;

const buildPackageMetricValue = ({
  name,
  buildTime,
}: Pick<Package, 'name' | 'buildTime'>) => `${name}_${buildTime || 'unknown'}`;

export const getPackageTimestampWarnings = ({
  dict,
  packages,
}: {
  dict?: string[];
  packages: Package[];
}) => {
  const warningTimestamps = new Map<number, Set<string>>();

  if (!dict?.length || packages.length === 0) {
    return new Map<number, string[]>();
  }

  const packageCandidates = packages.map((pkg) => ({
    pkg,
    currentMetricValue: buildPackageMetricValue(pkg),
  }));

  const exactMatchMap = new Map<string, (typeof packageCandidates)[0]>();
  const nameMatchMap = new Map<string, (typeof packageCandidates)[0]>();

  // Sort by name length descending to ensure the longest package name wins in prefix match
  for (const candidate of [...packageCandidates].sort(
    (a, b) => b.pkg.name.length - a.pkg.name.length,
  )) {
    if (!exactMatchMap.has(candidate.currentMetricValue)) {
      exactMatchMap.set(candidate.currentMetricValue, candidate);
    }
    if (!nameMatchMap.has(candidate.pkg.name)) {
      nameMatchMap.set(candidate.pkg.name, candidate);
    }
  }

  for (const entry of dict) {
    if (!entry.startsWith(PACKAGE_METRIC_PREFIX)) {
      continue;
    }

    const metricValue = entry.slice(PACKAGE_METRIC_PREFIX.length);
    if (!metricValue) {
      continue;
    }

    let matchedPackage = exactMatchMap.get(metricValue);

    if (!matchedPackage) {
      let idx = metricValue.lastIndexOf('_');
      while (idx !== -1) {
        const potentialName = metricValue.slice(0, idx);
        matchedPackage = nameMatchMap.get(potentialName);
        if (matchedPackage) {
          break;
        }
        idx = metricValue.lastIndexOf('_', idx - 1);
      }
    }

    if (!matchedPackage || metricValue === matchedPackage.currentMetricValue) {
      continue;
    }

    const timestamp = metricValue.startsWith(`${matchedPackage.pkg.name}_`)
      ? metricValue.slice(matchedPackage.pkg.name.length + 1) || 'unknown'
      : metricValue;
    const currentWarningTimestamps =
      warningTimestamps.get(matchedPackage.pkg.id) ?? new Set<string>();
    currentWarningTimestamps.add(timestamp);
    warningTimestamps.set(matchedPackage.pkg.id, currentWarningTimestamps);
  }

  return new Map(
    Array.from(warningTimestamps.entries()).map(([packageId, timestamps]) => [
      packageId,
      Array.from(timestamps).sort(),
    ]),
  );
};

const getCooldownRemainingSeconds = (
  storageKey: string,
  durationMs: number,
) => {
  const storedSentAt = window.localStorage.getItem(storageKey);
  const sentAt = Number(storedSentAt);

  if (!Number.isFinite(sentAt) || sentAt <= 0) {
    return 0;
  }

  const remainingMs = durationMs - (Date.now() - sentAt);
  if (remainingMs <= 0) {
    window.localStorage.removeItem(storageKey);
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
};

export const useLocalStorageCooldown = ({
  storageKey,
  durationMs,
}: {
  storageKey: string;
  durationMs: number;
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    const syncRemainingSeconds = () => {
      setRemainingSeconds(getCooldownRemainingSeconds(storageKey, durationMs));
    };

    syncRemainingSeconds();
    const timer = window.setInterval(syncRemainingSeconds, 1000);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        syncRemainingSeconds();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', handleStorage);
    };
  }, [storageKey, durationMs]);

  const startCooldown = () => {
    window.localStorage.setItem(storageKey, String(Date.now()));
    setRemainingSeconds(Math.ceil(durationMs / 1000));
  };

  return {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    startCooldown,
  };
};

export const useUserInfo = () => {
  const { data } = useQuery({
    queryKey: ['userInfo'],
    queryFn: api.me,
    enabled: () => !!getToken(),
  });
  const user =
    data?.tier === 'custom' && data.quota
      ? {
          ...data,
          quota: {
            ...data.quota,
            title: '定制版',
          },
        }
      : data;
  const expireDay = dayjs(data?.tierExpiresAt);
  const displayExpireDay = data?.tierExpiresAt
    ? expireDay.format('YYYY年MM月DD日')
    : '无';
  const remainingDays = data?.tierExpiresAt
    ? expireDay.diff(dayjs(), 'day')
    : null;
  const isExpiringSoon = remainingDays !== null && remainingDays <= 90;
  const displayRemainingDays = isExpiringSoon
    ? `(剩余 ${remainingDays} 天，之后转为免费版)`
    : '';
  return {
    user: getToken() ? user : null,
    displayExpireDay,
    displayRemainingDays,
    isExpiringSoon,
  };
};

export const useAppList = () => {
  const { data } = useQuery({
    queryKey: ['appList'],
    queryFn: api.appList,
  });
  return { apps: data?.data };
};

export const useApp = (appId: number) => {
  const { data } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => api.getApp(appId),
  });
  return { app: data };
};

export const usePackages = (appId: number) => {
  const { data, isLoading } = useQuery({
    queryKey: ['packages', appId],
    queryFn: () => api.getPackages(appId),
  });
  const { unusedPackages, packageMap, packages } = useMemo(() => {
    const packages = data?.data ?? [];
    const unusedPackages = [];
    const packageMap = new Map();
    for (const p of packages) {
      if (p.versions === null) {
        unusedPackages.push(p);
      }
      packageMap.set(p.id, p);
    }
    return { unusedPackages, packageMap, packages };
  }, [data?.data]);
  return {
    packages,
    unusedPackages,
    packageMap,
    isLoading,
  };
};

export const useVersions = ({
  appId,
  offset = 0,
  limit = 10,
}: {
  appId: number;
  offset?: number;
  limit?: number;
}) => {
  // Fetch all versions (up to 1000) from backend and cache them
  const { data, isLoading } = useQuery({
    queryKey: ['versions', appId],
    staleTime: 3000,
    queryFn: () => api.getVersions({ appId, offset: 0, limit: 1000 }),
  });

  // Implement frontend pagination
  const allVersions = data?.data ?? [];
  const totalCount = data?.count ?? 0;

  // Calculate pagination
  const startIndex = offset;
  const endIndex = offset + limit;
  const paginatedVersions = allVersions.slice(startIndex, endIndex);

  return {
    versions: paginatedVersions,
    count: totalCount,
    isLoading,
    // Also return all versions for components that might need them
    allVersions,
  };
};

export const useBinding = (appId: number) => {
  const { data, isLoading } = useQuery({
    queryKey: ['bindings', appId],
    queryFn: () => api.getBinding(appId),
  });
  const bindings = data?.data ?? [];
  return { bindings, isLoading };
};

export const usePackageTimestampWarnings = (appId: number) => {
  const { app } = useApp(appId);
  const { packages } = usePackages(appId);
  const [metricsRange] = useState(() => ({
    start: dayjs().subtract(7, 'day').toISOString(),
    end: dayjs().toISOString(),
  }));

  const { data, isLoading } = useQuery({
    queryKey: [
      'packageTimestampWarnings',
      appId,
      app?.appKey,
      metricsRange.start,
      metricsRange.end,
    ],
    queryFn: () =>
      api.getAppMetrics({
        appKey: app?.appKey as string,
        start: metricsRange.start,
        end: metricsRange.end,
      }),
    enabled:
      !!app?.appKey &&
      packages.length > 0 &&
      app.ignoreBuildTime !== 'enabled',
    staleTime: 1000 * 60 * 5,
  });

  const packageTimestampWarnings = useMemo(() => {
    if (app?.ignoreBuildTime === 'enabled') {
      return new Map<number, string[]>();
    }

    return getPackageTimestampWarnings({
      dict: data?.dict,
      packages,
    });
  }, [app?.ignoreBuildTime, data?.dict, packages]);

  return {
    app,
    packageTimestampWarnings,
    isLoading,
  };
};

export const useAuditLogs = ({
  offset = 0,
  limit = 20,
}: {
  offset?: number;
  limit?: number;
}) => {
  // Fetch all audit logs (up to 1000) from backend and cache them
  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs'],
    staleTime: 3000,
    queryFn: () =>
      api.getAuditLogs({
        offset: 0,
        limit: 1000,
        startDate: dayjs().subtract(180, 'day').toISOString(),
      }),
  });

  // Implement frontend pagination
  const allAuditLogs = data?.data ?? [];
  const totalCount = data?.count ?? 0;

  // Calculate pagination
  const startIndex = offset;
  const endIndex = offset + limit;
  const paginatedAuditLogs = allAuditLogs.slice(startIndex, endIndex);

  return {
    auditLogs: paginatedAuditLogs,
    count: totalCount,
    isLoading,
    // Also return all audit logs for components that might need them
    allAuditLogs,
  };
};
