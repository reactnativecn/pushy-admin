export interface ReleaseCounts {
  exposed: number;
  hit: number;
  miss: number;
  unknown: number;
  missingUUID: number;
  missingSDK: number;
  missingRule: number;
}

export interface RolloutInsight {
  id: string;
  packageVersion: string;
  mainHash: string;
  targetHash: string;
  rollout: number | null;
  algorithm: string;
  ruleDigest: string;
  requests: ReleaseCounts;
  exposedDevices: number | null;
  hitDevices: number | null;
  missDevices: number | null;
  unknownDevices: number | null;
  hitRate: number | null;
  status: string;
  inferred: boolean;
  approximate: boolean;
}

export interface ReleaseDelivery {
  id: string;
  hash: string;
  target: string;
  kind: string;
  reason: string;
  count: number;
}

export interface ReleaseInsightDay {
  date: string;
  status: string;
  requests: number | null;
  limited: boolean;
  cohorts: RolloutInsight[];
  deliveries: ReleaseDelivery[];
}

export interface ArtifactInsight {
  key: string;
  fromHash: string;
  toHash: string;
  taskType: string;
  state: string;
  format: string;
  observedAt: string;
  artifactBytes: number | null;
  fullBytes: number | null;
  reduction: number | null;
}

export interface ReleaseVersionInsight {
  hash: string;
  name: string;
  bytecodeVersion: number | null;
  baseVersionId: number | null;
  hermesBaseOutcome: string;
  hermesBaseDetail: string;
  artifactStatus: string;
  artifactsLimited: boolean;
  artifacts: ArtifactInsight[];
}

export interface ReleaseInsights {
  status: string;
  timezone: string;
  retentionDays: number;
  artifactRetentionDays: number;
  days: ReleaseInsightDay[];
  versions: ReleaseVersionInsight[];
}
