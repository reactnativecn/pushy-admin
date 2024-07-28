type Style = { [name: string]: import('react').CSSProperties };

declare module '*.svg';
declare module '*.png';
declare module '*.jpg';

interface User {
  email: string;
  id: number;
  name: string;
  tier: 'free' | 'standard' | 'premium' | 'pro';
  tierExpiresAt?: string;
}

interface App {
  id: number;
  name: string;
  platform: 'android' | 'ios';
  status?: 'normal' | 'paused';
  ignoreBuildTime?: 'enabled' | 'disabled';
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
}

interface AppDetail extends App {
  appKey: string;
  appSecret: string;
  downloadUrl: string;
}
