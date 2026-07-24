declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';

  const content: string;
  export default content;
  export const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module 'bun:test' {
  type TestHandler = () => void | Promise<void>;
  type ExpectAssertions = {
    toBe(expected: unknown): void;
    toBeGreaterThan(expected: number): void;
    toBeInstanceOf(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toContain(expected: unknown): void;
    toEqual(expected: unknown): void;
    toHaveBeenCalledWith(...args: unknown[]): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledTimes(expected: number): void;
    toHaveLength(expected: number): void;
    toThrow(expected?: unknown): void;
  };
  type ExpectMatchers = ExpectAssertions & {
    not: ExpectAssertions;
    rejects: ExpectAssertions;
    resolves: ExpectAssertions;
  };

  export function describe(name: string, fn: TestHandler): void;
  export function it(name: string, fn: TestHandler): void;
  export function test(name: string, fn: TestHandler): void;
  export function expect<T>(actual: T): ExpectMatchers;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function setSystemTime(time: Date | number | null): void;
  export const mock: {
    module(path: string, factory: () => any): void;
    restore(): void;
    <T extends (...args: any[]) => any>(
      fn?: T,
    ): T & { mockClear(): void; mockImplementationOnce(fn: T): void };
  };
}

// ===== analytics (ported from cresc-admin) =====
interface WorkerStatsDistribution {
  avg: number;
  p50: number;
  p95: number;
  max: number;
}

interface WorkerTaskDaySummary {
  date: string;
  count: number;
  byResult: Record<string, number>;
  durationMs: WorkerStatsDistribution | null;
  patchBytes: WorkerStatsDistribution | null;
  artifactBytes: WorkerStatsDistribution | null;
}

interface GlobalAnalyticsDay {
  date: string;
  dau: number;
  countries: Record<string, number>;
  hit: Record<string, number>;
  os: Record<string, number>;
  sdk: Record<string, number>;
  topApps: Array<{ appKey: string; dau: number }>;
}

interface QuotaAlert {
  userId: number;
  email: string;
  tier: string;
  kind: 'near_limit' | 'usage_drop' | 'usage_spike';
  usage: number;
  quotaPv: number;
  last7Avg: number;
  prev7Avg: number;
}

interface GrowthDay {
  date: string;
  mauGlobal: number;
  newDevicesGlobal: number | null;
  perApp: Record<string, { mau: number; new: number | null }>;
}

interface VersionHealthOverviewRow {
  appKey: string | null;
  appName: string;
  platform: string | null;
  hash: string;
  packageVersion: string;
  counts: Record<string, number>;
  rollbackRate: number | null;
  downloadFailRate: number | null;
  startSamples: number;
}
