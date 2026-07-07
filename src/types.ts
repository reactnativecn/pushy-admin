export type Tier =
  | 'free'
  | 'standard'
  | 'premium'
  | 'pro'
  | 'vip1'
  | 'vip2'
  | 'vip3'
  | 'custom';

export interface User {
  email: string;
  id: number;
  name: string;
  tier: Tier;
  tierExpiresAt?: string;
  checkQuota?: number;
  last7dAvg?: number;
  last7dCounts?: number[];
  quota?: Quota;
  serverTime?: string;
  admin?: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  status: 'normal' | 'unverified' | null;
  tier: Tier;
  tierExpiresAt?: string | null;
  quota?: Quota | null;
  createdAt?: string;
}

export interface AdminApp {
  id: number;
  userId: number | null;
  platform: 'ios' | 'android' | 'harmony';
  name: string;
  appKey: string;
  appSecret: string;
  checkCount?: number;
  downloadUrl: string | null;
  status: string | null;
  ignoreBuildTime: 'enabled' | 'disabled' | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminVersion {
  id: number;
  appId: number;
  hash: string;
  name: string;
  description: string | null;
  metaInfo: string | null;
  config: Record<string, any> | null;
  deps: string | null;
  commit: string | null;
  createdAt?: string;
}

export interface Quota {
  base?: Exclude<Tier, 'custom'>;
  title?: string;
  app: number;
  package: number;
  packageSize: string;
  bundle: number;
  bundleSize: string;
  checkUpdateAddonUnits?: number;
  monthlyRenewalPrice?: number;
  pv: number;
  price?: number;
}

export interface App {
  id: number;
  name: string;
  platform: 'android' | 'ios' | 'harmony';
  status?: 'normal' | 'paused' | null;
  ignoreBuildTime?: 'enabled' | 'disabled' | null;
  checkCount?: number;
  downloadUrl?: string | null;
  appKey?: string;
}

export interface PackageBase {
  id: number;
  name: string;
  note?: string;
  status?: 'normal' | 'paused' | 'expired' | null;
}

export interface Package extends PackageBase {
  buildTime?: string;
  buildNumber?: string;
  deps?: Record<string, string>;
  commit?: Commit;
  hash: string;
  versions?: Version | null;
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  origin?: string;
}

export interface Version {
  createdAt?: string;
  description?: string;
  hash: string;
  id: number;
  metaInfo?: string;
  name: string;
  packages?: PackageBase[];
  config?: {
    rollout?: {
      [packageVersion: string]: number | null;
    };
  };
  deps?: Record<string, string>;
  commit?: Commit;
}

export interface AppDetail extends App {
  appKey: string;
  appSecret: string;
  downloadUrl?: string;
}

export interface ContentProps {
  app: App;
}

export interface VersionConfig {
  rollout?: {
    [packageVersion: string]: number | null;
  };
}

export type BindingType = 'full' | 'exp';

export interface Binding {
  id: number;
  type: BindingType;
  versionId: number;
  packageId: number;
  rollout: number;
}

export type DiffPairStatus = 'pending' | 'done' | 'failed';

export interface BindingDiffStatus {
  packageId: number;
  versionId: number;
  status: DiffPairStatus;
}

export interface VersionDiffSummary {
  pending: number;
  done: number;
  failed: number;
  total: number;
}

export interface AuditLog {
  id: number;
  method: string;
  path: string;
  data?: Record<string, any>;
  statusCode: string;
  ip?: string;
  userAgent?: string;
  apiTokens?: {
    name?: string;
    tokenSuffix: string;
  };
  createdAt: string;
}

export interface ApiToken {
  id: number;
  name: string;
  token?: string;
  tokenSuffix: string;
  permissions: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  };
  scopes?: string[] | null;
  appIds?: number[] | null;
  createdBy?: number | null;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isRevoked: boolean;
}

export type SystemInstanceRole = 'server' | 'worker' | 'fc-worker';

export interface SystemInstance {
  id: string;
  role: SystemInstanceRole;
  hostname: string;
  pid: number;
  version: string;
  commit: string;
  buildTime: string;
  runtimeVersion: string;
  startTime: string;
  uptimeSeconds: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpuPercent: number | null;
  system: {
    loadavg: number[];
    totalMemory: number;
    freeMemory: number;
  };
  extra?: {
    worker?: {
      currentTask: {
        id: number;
        type: string;
        fromHash: string;
        toHash: string;
        startedAt: string;
      } | null;
      counters: {
        processed: number;
        locked: number;
        retry: number;
        failed: number;
      };
    };
  };
  updatedAt: string;
}

export interface SystemDeployStatus {
  commandId: string;
  action: 'restart' | 'update';
  version?: string;
  status: 'installing' | 'restarting' | 'failed';
  message?: string;
  fromVersion: string;
  updatedAt: string;
}

export interface SystemNpmInfo {
  name: string;
  distTags: Record<string, string>;
  versions: Array<{
    version: string;
    publishedAt: string | null;
  }>;
  fetchedAt: string;
  currentVersion: string;
}

export type MemberRole = 'admin' | 'developer' | 'viewer';
export type MemberStatus = 'pending' | 'active';

export interface AccountMember {
  id: number;
  role: MemberRole;
  appIds: number[] | null;
  status: MemberStatus;
  createdAt: string;
  member: { id: number; email: string; name: string };
}

export interface Workspace {
  id: number;
  role: MemberRole;
  status: MemberStatus;
  appIds: number[] | null;
  createdAt: string;
  account: { id: number; email: string; name: string };
}
