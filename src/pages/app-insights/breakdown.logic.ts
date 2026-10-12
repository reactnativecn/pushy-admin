import { MIN_EVENT_SAMPLES } from '@/constants/metric-thresholds';
import { percentOf, validCount } from './logic';
import type { AppEventBreakdownDay, ClientEventType } from './types';

// 失败诊断：按原因、系统、运营商拆分客户端事件报告。

export const FAILURE_EVENT_TYPES: ReadonlySet<ClientEventType> = new Set([
  'download_fail',
  'patch_fail',
  'rollback',
]);
// Rollbacks are reported without an error detail, so only download and
// patch failures carry a classified reason.
const REASON_EVENT_TYPES: ReadonlySet<ClientEventType> = new Set([
  'download_fail',
  'patch_fail',
]);
export type EventTypeCounts = Record<ClientEventType, number>;
const emptyEventCounts = (): EventTypeCounts => ({
  download_success: 0,
  download_fail: 0,
  patch_fail: 0,
  rollback: 0,
  mark_success: 0,
});

export interface DimensionRow {
  key: string;
  counts: EventTypeCounts;
  total: number;
  failureRate: number | null;
  rollbackRate: number | null;
  failureSamples: number;
  rollbackSamples: number;
}

const finishDimensionRow = (
  key: string,
  counts: EventTypeCounts,
): DimensionRow => {
  const failureSamples =
    counts.download_success + counts.download_fail + counts.patch_fail;
  const rollbackSamples = counts.mark_success + counts.rollback;
  return {
    key,
    counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    failureRate:
      failureSamples > 0
        ? (counts.download_fail + counts.patch_fail) / failureSamples
        : null,
    rollbackRate:
      rollbackSamples > 0 ? counts.rollback / rollbackSamples : null,
    failureSamples,
    rollbackSamples,
  };
};

export const highestFailureDimension = (rows: readonly DimensionRow[]) =>
  [...rows]
    .filter(
      (row) =>
        row.failureSamples >= MIN_EVENT_SAMPLES && (row.failureRate ?? 0) > 0,
    )
    .sort(
      (left, right) =>
        (right.failureRate ?? 0) - (left.failureRate ?? 0) ||
        right.failureSamples - left.failureSamples ||
        left.key.localeCompare(right.key),
    )[0] ?? null;

export interface ReasonVersion {
  hash: string;
  name: string | null;
  count: number;
}
export interface ReasonRow {
  reason: string;
  count: number;
  percent: number;
  byType: Partial<Record<ClientEventType, number>>;
  versions: ReasonVersion[];
}
export interface BreakdownSummary {
  totalDays: number;
  availableDays: number;
  unavailableDays: number;
  failures: number;
  reasons: ReasonRow[];
  os: DimensionRow[];
  carriers: DimensionRow[];
  versionNames: Map<string, string | null>;
}

export const summarizeBreakdown = (
  days: readonly AppEventBreakdownDay[] | undefined,
  hashFilter?: string,
): BreakdownSummary => {
  const reasons = new Map<
    string,
    {
      count: number;
      byType: Partial<Record<ClientEventType, number>>;
      versions: Map<string, ReasonVersion>;
    }
  >();
  const os = new Map<string, EventTypeCounts>();
  const carriers = new Map<string, EventTypeCounts>();
  const versionNames = new Map<string, string | null>();
  let failures = 0;
  let availableDays = 0;
  let unavailableDays = 0;
  for (const day of days ?? []) {
    const legacyHasReports = [
      ...(day.byReason ?? []),
      ...(day.byOS ?? []),
      ...(day.byCarrier ?? []),
    ].some((item) => validCount(item.count) && item.count > 0);
    // Availability belongs to the unfiltered bucket, not to the selected
    // version. Explicit unavailable always wins over leftover numeric fields.
    if (
      day.status === 'unavailable' ||
      (day.status !== 'observed' && !legacyHasReports)
    ) {
      unavailableDays += 1;
      continue;
    }
    availableDays += 1;
    for (const item of day.byReason ?? []) {
      if (hashFilter && item.hash !== hashFilter) continue;
      if (
        !validCount(item.count) ||
        item.count <= 0 ||
        !REASON_EVENT_TYPES.has(item.type)
      ) {
        continue;
      }
      failures += item.count;
      if (!versionNames.has(item.hash) || item.name !== null) {
        versionNames.set(item.hash, item.name);
      }
      const parsed = parseFailureReason(item.reason);
      const reason = parsed.kind === 'known' ? parsed.reason : 'other';
      const entry = reasons.get(reason) ?? {
        count: 0,
        byType: {} as Partial<Record<ClientEventType, number>>,
        versions: new Map<string, ReasonVersion>(),
      };
      entry.count += item.count;
      entry.byType[item.type] = (entry.byType[item.type] ?? 0) + item.count;
      const version = entry.versions.get(item.hash) ?? {
        hash: item.hash,
        name: item.name,
        count: 0,
      };
      version.count += item.count;
      if (item.name !== null) version.name = item.name;
      entry.versions.set(item.hash, version);
      reasons.set(reason, entry);
    }
    for (const item of day.byOS ?? []) {
      if (hashFilter && item.hash !== hashFilter) continue;
      if (!validCount(item.count) || item.count <= 0) continue;
      if (!versionNames.has(item.hash) || item.name !== null) {
        versionNames.set(item.hash, item.name);
      }
      const counts = os.get(item.os) ?? emptyEventCounts();
      if (Object.hasOwn(counts, item.type)) counts[item.type] += item.count;
      os.set(item.os, counts);
    }
    if (hashFilter) continue;
    for (const item of day.byCarrier ?? []) {
      if (!validCount(item.count) || item.count <= 0) continue;
      const counts = carriers.get(item.carrier) ?? emptyEventCounts();
      if (Object.hasOwn(counts, item.type)) counts[item.type] += item.count;
      carriers.set(item.carrier, counts);
    }
  }
  const byCount = (a: DimensionRow, b: DimensionRow) =>
    b.total - a.total || a.key.localeCompare(b.key);
  return {
    totalDays: days?.length ?? 0,
    availableDays,
    unavailableDays,
    failures,
    reasons: Array.from(reasons, ([reason, entry]) => ({
      reason,
      count: entry.count,
      percent: percentOf(entry.count, failures),
      byType: entry.byType,
      versions: Array.from(entry.versions.values()).sort(
        (a, b) => b.count - a.count || a.hash.localeCompare(b.hash),
      ),
    })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    os: Array.from(os, ([key, counts]) => finishDimensionRow(key, counts)).sort(
      byCount,
    ),
    carriers: Array.from(carriers, ([key, counts]) =>
      finishDimensionRow(key, counts),
    ).sort(byCount),
    versionNames,
  };
};

const KNOWN_FAILURE_REASONS = [
  'empty',
  'crc_mismatch',
  'patch_apply',
  'no_space',
  'timeout',
  'network',
  'http_4xx',
  'http_5xx',
  'file_io',
  'zip',
  'bundle_mismatch',
] as const;
export type KnownFailureReason = (typeof KNOWN_FAILURE_REASONS)[number];

export const parseFailureReason = (
  reason: string,
): { kind: 'known'; reason: KnownFailureReason } | { kind: 'other' } =>
  KNOWN_FAILURE_REASONS.includes(reason as KnownFailureReason)
    ? { kind: 'known', reason: reason as KnownFailureReason }
    : { kind: 'other' };

const KNOWN_CARRIERS = [
  '电信',
  '联通',
  '移动',
  '广电',
  '教育网',
  '云',
  '其他',
  '其他地区',
  'unknown',
] as const;
export type KnownCarrier = (typeof KNOWN_CARRIERS)[number];
export const isKnownCarrier = (carrier: string): carrier is KnownCarrier =>
  KNOWN_CARRIERS.includes(carrier as KnownCarrier);
