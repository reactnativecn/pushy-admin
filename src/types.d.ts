type Style = { [name: string]: import('react').CSSProperties };

declare module '*.png' {
  const content: string;
  export default content;
}
declare module '*.jpg' {
  const content: string;
  export default content;
}

interface User {
  email: string;
  id: number;
  name: string;
  tier: 'free' | 'standard' | 'premium' | 'pro';
  tierExpiresAt?: string;
  checkQuota?: number;
  last7dAvg?: number;
}

interface App {
  id: number;
  name: string;
  platform: 'android' | 'ios';
  status?: 'normal' | 'paused';
  ignoreBuildTime?: 'enabled' | 'disabled';
  checkCount?: number;
  downloadUrl?: string;
  appKey?: string;
}

interface PackageBase {
  id: number;
  name: string;
  note: string;
  status: 'normal' | 'paused' | 'expired';
}

interface Package extends PackageBase {
  buildTime: string;
  hash: string;
  version: Version;
}

interface Version {
  description: string;
  hash: string;
  id: number;
  metaInfo: string;
  name: string;
  packages: PackageBase[];
  config?: {
    rollout?: {
      [packageVersion: string]: number | null;
    };
  };
}

interface AppDetail extends App {
  appKey: string;
  appSecret: string;
  downloadUrl: string;
}

interface SiderMenuProps {
  selectedKeys?: string[];
}

interface CotentProps {
  app: App;
}
