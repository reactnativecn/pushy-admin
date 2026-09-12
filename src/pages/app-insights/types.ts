// pushy-go 三个按应用的洞察接口的响应形状（docs/client-telemetry.md「读取入口」）。
// 三个接口共用 /metrics/app/geo 的授权边界与 days 参数（默认 7，上限 35）。

/** checkUpdate 请求的最终结果分类（服务端 classifyResult）。 */
export const HIT_OUTCOMES = [
  'uptodate',
  'hdiff',
  'pdiff',
  'full',
  'paused',
  'expired',
  'blocked',
  'unknown_package',
] as const;
export type HitOutcome = (typeof HIT_OUTCOMES)[number];

export interface PackageTraffic {
  packageVersion: string;
  requests: number;
  /** 来自 HLL，可能为 0（没有 uuid 或超出跟踪上限）。 */
  devices: number;
}

/** 一个北京时间自然日的流量；今天为实时累计。 */
export interface AppTrafficDay {
  date: string;
  /** hit:* 之和，即含拒绝在内的全部完成请求。 */
  requests: number;
  dau: number;
  hourly: number[];
  hit: Partial<Record<HitOutcome, number>> & Record<string, number>;
  ipVersion: Record<string, number>;
  hosts: Record<string, number>;
  carriers: Record<string, number>;
  packages: PackageTraffic[];
}

export interface AppTrafficResponse {
  days: AppTrafficDay[];
  retentionDays: number;
}

export const CLIENT_EVENT_TYPES = [
  'download_success',
  'download_fail',
  'patch_fail',
  'rollback',
  'mark_success',
] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export interface EventOSCount {
  type: ClientEventType;
  hash: string;
  /** null 表示版本已删除。 */
  name: string | null;
  os: string;
  count: number;
}

export interface EventReasonCount {
  type: ClientEventType;
  hash: string;
  name: string | null;
  reason: string;
  count: number;
}

export interface EventCarrierCount {
  type: ClientEventType;
  carrier: string;
  count: number;
}

export interface AppEventBreakdownDay {
  date: string;
  byOS: EventOSCount[];
  byReason: EventReasonCount[];
  byCarrier: EventCarrierCount[];
}

export interface AppEventBreakdownResponse {
  days: AppEventBreakdownDay[];
  retentionDays: number;
}

export interface ServedCounts {
  hdiff: number;
  pdiff: number;
  full: number;
  /** 增量还没生成、退化成整包下发的次数。 */
  fullPending: number;
  exp: number;
}

export interface FunnelEventCounts {
  downloadSuccess: number;
  downloadFail: number;
  patchFail: number;
  markSuccess: number;
  rollback: number;
}

export const LAG_BUCKETS = [
  'lt1h',
  '1h-6h',
  '6h-24h',
  '1d-3d',
  '3d-7d',
  'gt7d',
] as const;
export type LagBucket = (typeof LAG_BUCKETS)[number];

export interface LagBuckets {
  downloadSuccess: Partial<Record<LagBucket, number>> | null;
  markSuccess: Partial<Record<LagBucket, number>> | null;
}

export interface PackageFunnel {
  packageVersion: string;
  served: ServedCounts;
  events: FunnelEventCounts;
}

export interface VersionFunnel {
  hash: string;
  name: string | null;
  served: ServedCounts;
  events: FunnelEventCounts;
  /** 累计激活 / 下载过该版本的设备数（HLL，不分日）。 */
  adopted: { mark: number; download: number };
  lag: LagBuckets;
  byPackage: PackageFunnel[];
}

export interface VersionFunnelResponse {
  days: number;
  start: string;
  end: string;
  /** 从这一 UTC 日起读实时小时桶。 */
  hourlyFrom: string;
  dauToday: number;
  truncated?: boolean;
  versions: VersionFunnel[];
}
