import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { hasSession } from '@/services/request';
import { getWorkspaceAccountId } from '@/services/workspace';
import type { App, Package, VersionDiffSummary } from '@/types';
import dayjs from '@/utils/dayjs';
import {
  appKeys,
  auditKeys,
  bindingKeys,
  memberKeys,
  packageKeys,
  userKeys,
  versionKeys,
} from '@/utils/query-keys';
import { safeStorage } from '@/utils/storage';

const METRIC_CATEGORY_SEPARATOR = '\u001f';
const BUILD_TIME_METRIC_PREFIX = `packageVersion_buildTime${METRIC_CATEGORY_SEPARATOR}`;
const BUNDLE_HASH_METRIC_PREFIX = `packageVersion_bundleHash${METRIC_CATEGORY_SEPARATOR}`;

const buildPackageMetricValue = ({
  name,
  buildTime,
}: Pick<Package, 'name' | 'buildTime'>) => `${name}_${buildTime || 'unknown'}`;

const isIgnoredTimestamp = (timestamp: string) => {
  const normalizedTimestamp = timestamp.trim();
  if (normalizedTimestamp === 'unknown') {
    return true;
  }

  return normalizedTimestamp !== '' && Number(normalizedTimestamp) === 0;
};

export interface PackageMetricWarnings {
  timestamps: string[];
  hashes: string[];
}

export const getPackageMetricWarnings = ({
  dict,
  packages,
}: {
  dict?: string[];
  packages: Package[];
}) => {
  const warnings = new Map<
    number,
    { timestamps: Set<string>; hashes: Set<string> }
  >();

  if (!dict?.length || packages.length === 0) {
    return new Map<number, PackageMetricWarnings>();
  }

  const packageCandidates = packages.map((pkg) => ({
    pkg,
    currentBuildTimeValue: buildPackageMetricValue(pkg),
    currentBundleHashValue: pkg.bundleHash
      ? `${pkg.name}_${pkg.bundleHash}`
      : undefined,
  }));

  const buildTimeExactMap = new Map<string, (typeof packageCandidates)[0]>();
  const bundleHashExactMap = new Map<string, (typeof packageCandidates)[0]>();
  const nameMatchMap = new Map<string, (typeof packageCandidates)[0]>();

  // Sort by name length descending to ensure the longest package name wins in prefix match
  for (const candidate of [...packageCandidates].sort(
    (a, b) => b.pkg.name.length - a.pkg.name.length,
  )) {
    if (!buildTimeExactMap.has(candidate.currentBuildTimeValue)) {
      buildTimeExactMap.set(candidate.currentBuildTimeValue, candidate);
    }
    if (
      candidate.currentBundleHashValue &&
      !bundleHashExactMap.has(candidate.currentBundleHashValue)
    ) {
      bundleHashExactMap.set(candidate.currentBundleHashValue, candidate);
    }
    if (!nameMatchMap.has(candidate.pkg.name)) {
      nameMatchMap.set(candidate.pkg.name, candidate);
    }
  }

  const matchByName = (metricValue: string) => {
    let idx = metricValue.lastIndexOf('_');
    while (idx !== -1) {
      const matched = nameMatchMap.get(metricValue.slice(0, idx));
      if (matched) {
        return matched;
      }
      idx = metricValue.lastIndexOf('_', idx - 1);
    }
    return undefined;
  };

  const addWarning = (
    packageId: number,
    kind: 'timestamps' | 'hashes',
    value: string,
  ) => {
    const current = warnings.get(packageId) ?? {
      timestamps: new Set<string>(),
      hashes: new Set<string>(),
    };
    current[kind].add(value);
    warnings.set(packageId, current);
  };

  for (const entry of dict) {
    const isBuildTimeEntry = entry.startsWith(BUILD_TIME_METRIC_PREFIX);
    const isBundleHashEntry =
      !isBuildTimeEntry && entry.startsWith(BUNDLE_HASH_METRIC_PREFIX);
    if (!isBuildTimeEntry && !isBundleHashEntry) {
      continue;
    }

    const metricValue = entry.slice(
      isBuildTimeEntry
        ? BUILD_TIME_METRIC_PREFIX.length
        : BUNDLE_HASH_METRIC_PREFIX.length,
    );
    if (!metricValue) {
      continue;
    }

    if (isBuildTimeEntry) {
      const matchedPackage =
        buildTimeExactMap.get(metricValue) ?? matchByName(metricValue);
      if (
        !matchedPackage ||
        metricValue === matchedPackage.currentBuildTimeValue
      ) {
        continue;
      }
      // 指纹包若没有登记 buildTime，则没有可比对的基准时间戳，
      // 老客户端上报的任何真实时间都不构成告警（身份以指纹为准）
      if (matchedPackage.pkg.bundleHash && !matchedPackage.pkg.buildTime) {
        continue;
      }

      const timestamp = metricValue.startsWith(`${matchedPackage.pkg.name}_`)
        ? metricValue.slice(matchedPackage.pkg.name.length + 1) || 'unknown'
        : metricValue;
      if (isIgnoredTimestamp(timestamp)) {
        continue;
      }
      addWarning(matchedPackage.pkg.id, 'timestamps', timestamp);
    } else {
      const matchedPackage =
        bundleHashExactMap.get(metricValue) ?? matchByName(metricValue);
      // 只有登记了指纹的包才有比对基准；老包上报的指纹无从校验
      if (
        !matchedPackage?.pkg.bundleHash ||
        metricValue === matchedPackage.currentBundleHashValue
      ) {
        continue;
      }

      const hash = metricValue.startsWith(`${matchedPackage.pkg.name}_`)
        ? metricValue.slice(matchedPackage.pkg.name.length + 1)
        : metricValue;
      if (!hash || hash === 'unknown') {
        continue;
      }
      addWarning(matchedPackage.pkg.id, 'hashes', hash);
    }
  }

  return new Map(
    Array.from(warnings.entries()).map(([packageId, packageWarnings]) => [
      packageId,
      {
        timestamps: Array.from(packageWarnings.timestamps).sort(),
        hashes: Array.from(packageWarnings.hashes).sort(),
      },
    ]),
  );
};

const getCooldownRemainingSeconds = (
  storageKey: string,
  durationMs: number,
) => {
  const storedSentAt = safeStorage.get(storageKey);
  const sentAt = Number(storedSentAt);

  if (!Number.isFinite(sentAt) || sentAt <= 0) {
    return 0;
  }

  const remainingMs = durationMs - (Date.now() - sentAt);
  if (remainingMs <= 0) {
    safeStorage.remove(storageKey);
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
    safeStorage.set(storageKey, String(Date.now()));
    setRemainingSeconds(Math.ceil(durationMs / 1000));
  };

  return {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    startCooldown,
  };
};

export const useUserInfo = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: userKeys.info(),
    queryFn: api.me,
    enabled: () => hasSession(),
  });
  const user =
    data?.tier === 'custom' && data.quota
      ? {
          ...data,
          quota: {
            ...data.quota,
            title: t('user.purchasable_tiers.custom'),
          },
        }
      : data;
  const expireDay = dayjs(data?.tierExpiresAt);
  const displayExpireDay = data?.tierExpiresAt
    ? expireDay.format(t('user.date_format'))
    : t('user.no_expire');
  const now = data?.serverTime ? dayjs(data.serverTime) : dayjs();
  const remainingDays = data?.tierExpiresAt
    ? expireDay.add(1, 'day').diff(now, 'day')
    : null;
  const isExpiringSoon =
    remainingDays !== null && remainingDays >= 0 && remainingDays <= 90;
  const displayRemainingDays = isExpiringSoon
    ? t('user.remaining_note', { days: remainingDays })
    : '';
  return {
    user: hasSession() ? user : null,
    displayExpireDay,
    displayRemainingDays,
    isExpiringSoon,
    isLoading,
  };
};

export const useAppList = () => {
  const { data, isLoading } = useQuery({
    queryKey: appKeys.list(),
    queryFn: api.appList,
  });
  return { apps: data?.data, isLoading };
};

export const useApp = (appId: number) => {
  const { data } = useQuery({
    queryKey: appKeys.detail(appId),
    queryFn: () => api.getApp(appId),
  });
  return { app: data };
};

export const usePackages = (appId: number) => {
  const { data, isLoading } = useQuery({
    queryKey: packageKeys.byApp(appId),
    queryFn: () => api.getPackages(appId),
  });
  const { packageMap, packages } = useMemo(() => {
    const packages = data?.data ?? [];
    const packageMap = new Map();
    for (const p of packages) {
      packageMap.set(p.id, p);
    }
    return { packageMap, packages };
  }, [data?.data]);
  return {
    packages,
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
  const { data, isLoading } = useQuery({
    queryKey: versionKeys.page(appId, offset, limit),
    staleTime: 3000,
    placeholderData: keepPreviousData,
    queryFn: () => api.getVersions({ appId, offset, limit }),
  });

  return {
    versions: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading,
  };
};

export const useAllVersions = ({
  appId,
  enabled = true,
}: {
  appId: number;
  enabled?: boolean;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: versionKeys.all(appId),
    staleTime: 3000,
    enabled,
    queryFn: () => api.getVersions({ appId, offset: 0, limit: 1000 }),
  });

  return {
    versions: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading,
  };
};

export const useBinding = (appId: number) => {
  const { data, isLoading } = useQuery({
    queryKey: bindingKeys.byApp(appId),
    queryFn: () => api.getBinding(appId),
  });
  const bindings = data?.data ?? [];
  return { bindings, isLoading };
};

const DIFF_STATUS_POLL_MS = 4000;

export const useDiffStatus = ({
  appId,
  enabled,
}: {
  appId: number;
  enabled: boolean;
}) => {
  const { data } = useQuery({
    queryKey: bindingKeys.diffStatus(appId),
    queryFn: () => api.getDiffStatus(appId),
    enabled,
    // 只在还有补丁生成中时轮询；到达终态（或旧服务端 404）自动停止
    refetchInterval: (query) =>
      query.state.data?.data?.some((item) => item.status === 'pending')
        ? DIFF_STATUS_POLL_MS
        : false,
  });

  const diffStatusByVersion = useMemo(() => {
    const map = new Map<number, VersionDiffSummary>();
    for (const item of data?.data ?? []) {
      const summary = map.get(item.versionId) ?? {
        pending: 0,
        done: 0,
        failed: 0,
        total: 0,
      };
      summary[item.status] += 1;
      summary.total += 1;
      map.set(item.versionId, summary);
    }
    return map;
  }, [data?.data]);

  return { diffStatusByVersion };
};

export const usePackageMetricWarnings = ({
  appId,
  app,
  packages,
}: {
  appId: number;
  app?: App;
  packages: Package[];
}) => {
  // 只看最近 24 小时:更早的掉队时间戳多半已自然消失,按周扫描误报偏多
  const [metricsRange] = useState(() => ({
    start: dayjs().subtract(24, 'hour').toISOString(),
    end: dayjs().toISOString(),
  }));

  const { data, isLoading } = useQuery({
    queryKey: [
      'packageMetricWarnings',
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
      !!app?.appKey && packages.length > 0 && app.ignoreBuildTime !== 'enabled',
    staleTime: 1000 * 60 * 5,
  });

  const packageMetricWarnings = useMemo(() => {
    if (app?.ignoreBuildTime === 'enabled') {
      return new Map<number, PackageMetricWarnings>();
    }

    return getPackageMetricWarnings({
      dict: data?.dict,
      packages,
    });
  }, [app?.ignoreBuildTime, data?.dict, packages]);

  return {
    app,
    packageMetricWarnings,
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
    queryKey: auditKeys.all(),
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

/**
 * 当前工作空间下的操作权限(镜像服务端角色矩阵,仅用于隐藏 UI 入口,
 * 真正的判定在服务端)。未切换工作空间 = owner,全量放行;
 * 工作空间成员按角色收敛:viewer 只读、developer 可发版、admin 可管应用。
 * 成员关系加载完成前默认拒绝,避免只读角色短暂看到写按钮。
 */
export const useWorkspacePermissions = () => {
  const workspaceAccountId = getWorkspaceAccountId();
  const { data } = useQuery({
    queryKey: memberKeys.workspaces(),
    queryFn: api.listWorkspaces,
    enabled: !!workspaceAccountId && hasSession(),
    staleTime: 60_000,
  });
  const role = workspaceAccountId
    ? data?.data?.find(
        (workspace) =>
          workspace.account.id === workspaceAccountId &&
          workspace.status === 'active',
      )?.role
    : undefined;
  const isOwner = !workspaceAccountId;
  return {
    /** owner 本人或工作空间角色;加载中为 undefined */
    role: isOwner ? ('owner' as const) : role,
    /** 发版类写操作:上传/发布/回滚/编辑与删除版本、原生包 */
    canPublish: isOwner || role === 'admin' || role === 'developer',
    /** 应用管理:创建/设置/删除应用 */
    canManageApp: isOwner || role === 'admin',
  };
};
