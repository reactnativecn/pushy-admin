// Additive v2 observation contract; optional fields support rolling deploys.
export interface ObservationWindow {
  timezone: string;
  startDate: string;
  endDate: string;
  startInclusive: string;
  endExclusive: string;
  today: string;
  generatedAt: string;
  partialDay: boolean;
}

export type ObservationStatus = 'observed' | 'unavailable';
export type DeviceStatus = ObservationStatus | 'partial' | 'expired';
export interface ObservationContract {
  version: number;
  collection: string;
}

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
  devices: number | null;
  devicesStatus?: DeviceStatus;
}

export interface RefusedPackage {
  outcome: 'blocked' | 'unknown_package';
  packageVersion: string;
  requests: number;
}

export interface AppTrafficDay {
  date: string;
  requests: number;
  dau: number;
  requestsStatus?: ObservationStatus;
  dauStatus?: ObservationStatus;
  hourly: number[];
  hit: Partial<Record<HitOutcome, number>> & Record<string, number>;
  ipVersion: Record<string, number>;
  hosts: Record<string, number>;
  carriers: Record<string, number>;
  /** 平台与系统版本，如 "android 14"；旧服务端不返回。 */
  os?: Record<string, number>;
  packages: PackageTraffic[];
  refused?: RefusedPackage[];
  packageDevicesLimited?: boolean;
}

export interface AppTrafficResponse {
  days: AppTrafficDay[];
  retentionDays: number;
  packageDevicesRetentionDays?: number;
  window?: ObservationWindow | null;
  contract?: ObservationContract;
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
  status?: ObservationStatus;
  byOS: EventOSCount[];
  byReason: EventReasonCount[];
  byCarrier: EventCarrierCount[];
}

export interface AppEventBreakdownResponse {
  days: AppEventBreakdownDay[];
  retentionDays: number;
  window?: ObservationWindow | null;
  contract?: ObservationContract;
}

// Offered targets/options, not unique requests or file downloads.
export interface ServedCounts {
  hdiff: number;
  pdiff: number;
  full: number;
  fullPending: number;
  exp: number;
}

// Unlinked client reports, not mutually exclusive update attempts.
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
  adopted: { mark: number; download: number };
  observed?: { mark: number | null; download: number | null };
  lag: LagBuckets;
  byPackage: PackageFunnel[];
}

export interface VersionEventSummary {
  versionCount: number;
  offeredTargets: number;
  events: FunnelEventCounts;
  unattributed: FunnelEventCounts;
  unattributedOffers: number;
}

export interface VersionFunnelResponse {
  releaseInsights?: import('./release-insights-types').ReleaseInsights;
  days: number;
  start: string;
  end: string;
  hourlyFrom: string;
  dauToday: number;
  truncated?: boolean;
  versions: VersionFunnel[];
  window?: ObservationWindow | null;
  dauWindow?: ObservationWindow | null;
  summary?: VersionEventSummary;
  contract?: ObservationContract & {
    servedUnit: string;
    eventUnit: string;
    deviceUnit: string;
    adoptionScope: string;
    adoptionInactivityDays: number;
    lagOrigin: string;
    lagUnit: string;
    lagInactivityDays: number;
    versionOrder: string;
  };
}
