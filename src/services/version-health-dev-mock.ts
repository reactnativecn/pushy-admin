import type { App } from '@/types';

const SEPARATOR = '\u001f';
const EVENT_TYPES = [
  'download_success',
  'download_fail',
  'patch_fail',
  'rollback',
  'mark_success',
] as const;
const RELEASES = [
  { version: '2.4.1', packageVersion: '5.2.0' },
  { version: '2.4.1', packageVersion: '5.1.0' },
  { version: '2.4.0', packageVersion: '5.2.0' },
] as const;

const apps: App[] = [
  {
    id: 101,
    name: 'Pushy 商城',
    platform: 'android',
    status: 'normal',
    appKey: 'mock-pushy-shop',
    checkCount: 128_640,
  },
];

const dict = RELEASES.flatMap(({ version, packageVersion }) =>
  EVENT_TYPES.map(
    (type) =>
      `${type}${SEPARATOR}${version}${SEPARATOR}${encodeURIComponent(packageVersion)}`,
  ),
);

function appendCounts(
  data: Array<[number, number]>,
  releaseIndex: number,
  counts: [number, number, number, number, number],
) {
  counts.forEach((count, typeIndex) => {
    if (count > 0) {
      data.push([releaseIndex * EVENT_TYPES.length + typeIndex, count]);
    }
  });
}

function buildSeries() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return Array.from({ length: 24 }, (_, index) => {
    const data: Array<[number, number]> = [];
    if (index >= 15) {
      appendCounts(data, 0, [8, 1, 1, index > 20 ? 2 : 1, 6]);
    }
    if (index >= 17) {
      appendCounts(data, 1, [4, index % 5 === 0 ? 1 : 0, 1, 0, 5]);
    }
    appendCounts(data, 2, [
      10,
      index % 9 === 0 ? 1 : 0,
      0,
      index === 6 ? 1 : 0,
      11,
    ]);
    return {
      time: new Date(now.getTime() - (23 - index) * 3_600_000).toISOString(),
      data,
    };
  });
}

export function getVersionHealthDevMock(method: string, path: string) {
  if (method !== 'get') return null;
  if (path === '/app/list') return { data: apps };
  if (path.startsWith('/metrics/app/events?')) {
    return { dict, data: buildSeries() };
  }
  return null;
}
