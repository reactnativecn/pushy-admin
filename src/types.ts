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
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isRevoked: boolean;
}
