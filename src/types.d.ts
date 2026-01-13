declare module '*.svg' {
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement>
  >;
}

declare module '*.png' {
  const content: string;
  export default content;
}
declare module '*.jpg' {
  const content: string;
  export default content;
}

type Tier = 'free' | 'standard' | 'premium' | 'pro' | 'custom';

interface User {
  email: string;
  id: number;
  name: string;
  tier: Tier;
  tierExpiresAt?: string;
  checkQuota?: number;
  last7dAvg?: number;
  quota?: Quota;
  admin?: boolean;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  status: 'normal' | 'unverified' | null;
  tier: string;
  tierExpiresAt?: string | null;
  quota?: Quota | null;
  createdAt?: string;
}

interface AdminApp {
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

interface AdminVersion {
  id: number;
  appId: number;
  hash: string;
  name: string;
  description: string | null;
  metaInfo: string | null;
  config: any | null;
  deps: string | null;
  commit: string | null;
  createdAt?: string;
}

export interface Quota {
  base?: Exclude<Tier, 'custom'>;
  app: number;
  package: number;
  packageSize: string;
  bundle: number;
  bundleSize: string;
  pv: number;
  price?: number;
}

interface App {
  id: number;
  name: string;
  platform: 'android' | 'ios' | 'harmony';
  status?: 'normal' | 'paused' | null;
  ignoreBuildTime?: 'enabled' | 'disabled';
  checkCount?: number;
  downloadUrl?: string;
  appKey?: string;
}

interface PackageBase {
  id: number;
  name: string;
  note?: string;
  status?: 'normal' | 'paused' | 'expired' | null;
}

interface Package extends PackageBase {
  buildTime?: string;
  buildNumber?: string;
  deps?: Record<string, string>;
  commit?: Commit;
  hash: string;
  versions?: Version;
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  origin?: string;
}

interface Version {
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

interface AppDetail extends App {
  appKey: string;
  appSecret: string;
  downloadUrl?: string;
}

interface SiderMenuProps {
  selectedKeys?: string[];
}

interface ContentProps {
  app: App;
}

interface VersionConfig {
  rollout?: {
    [packageVersion: string]: number | null;
  };
}

type BindingType = 'full' | 'exp';

interface Binding {
  id: number;
  type: BindingType;
  // appId: number;
  versionId: number;
  packageId: number;
  rollout: number;
}

interface AuditLog {
  id: number;
  method: string;
  path: string;
  data?: Record<string, any>;
  statusCode: string;
  ip?: string;
  userAgent?: string;
  apiTokens?: {
    tokenSuffix: string;
  };
  createdAt: string;
}
