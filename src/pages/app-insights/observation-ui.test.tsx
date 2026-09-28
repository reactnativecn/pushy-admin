import { afterEach, beforeEach, expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import '@/i18n';
import en from '@/i18n/locales/en.json';
import zhCN from '@/i18n/locales/zh-CN.json';
import { metricsKeys } from '@/utils/query-keys';
import { buildFunnelRows, filterFunnelRows } from './logic';
import { ObservationNotice, RollbackShare } from './observation-ui';
import { PackageObservation } from './traffic-panel';
import type { VersionFunnelResponse } from './types';
import { VersionDetail, VersionsPanel } from './versions-panel';

const insightsEn = en.app_insights;
const insightsZh = zhCN.app_insights;
const clients: QueryClient[] = [];
beforeEach(async () => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  global.ShadowRoot = class {} as any;
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});
const fixture = (): VersionFunnelResponse => ({
  days: 7,
  start: '2026-09-21',
  end: '2026-09-27',
  hourlyFrom: '2026-09-25',
  dauToday: 2,
  versions: [
    {
      hash: 'v1',
      name: 'V1',
      served: { hdiff: 0, pdiff: 0, full: 6, fullPending: 0, exp: 0 },
      events: {
        downloadSuccess: 5,
        downloadFail: 90,
        patchFail: 0,
        markSuccess: 10,
        rollback: 0,
      },
      adopted: { mark: 5, download: 5 },
      lag: { downloadSuccess: null, markSuccess: null },
      byPackage: [
        {
          packageVersion: '1.0',
          served: { hdiff: 0, pdiff: 0, full: 2, fullPending: 0, exp: 0 },
          events: {
            downloadSuccess: 2,
            downloadFail: 0,
            patchFail: 0,
            markSuccess: 2,
            rollback: 0,
          },
        },
      ],
    },
  ],
});

test('canonical metric language catalogs have identical keys', () => {
  expect(Object.keys(insightsEn).sort()).toEqual(
    Object.keys(insightsZh).sort(),
  );
  expect(i18n.t('app_insights.hit_uptodate')).toBe('No update');
  expect(i18n.t('app_insights.view_versions')).toBe('Versions');
});

test('compact rollback share shows the ratio and flags thin samples', () => {
  render(<RollbackShare health="warning" samples={200} count={3} />);
  expect(screen.getByText('1.5%')).not.toBeNull();
  expect(screen.getByText('3/200')).not.toBeNull();
  expect(screen.queryByText(insightsEn.samples_short)).toBeNull();
  cleanup();
  render(<RollbackShare health={null} samples={2} count={1} />);
  expect(screen.getByText('50.0%')).not.toBeNull();
  expect(screen.getByText(insightsEn.samples_short)).not.toBeNull();
});

test('package-filtered details hide whole-version cumulative metrics', () => {
  const row = filterFunnelRows(buildFunnelRows(fixture()), 'v1', '1.0')[0]!;
  render(<VersionDetail row={row} />);
  expect(
    screen.getByText(insightsEn.retained_unavailable_package),
  ).not.toBeNull();
  expect(screen.queryByText(insightsEn.retained_title)).toBeNull();
});

test('retained counts are rendered without a coverage or adoption percentage', () => {
  render(<VersionDetail row={buildFunnelRows(fixture())[0]!} />);
  expect(screen.getAllByText('≈ 5')).toHaveLength(2);
  expect(screen.queryByText('250.0%')).toBeNull();
  expect(screen.queryByText('Coverage')).toBeNull();
});

test('legacy table labels returned-version totals and keeps download failures visible', () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  clients.push(client);
  client.setQueryData(metricsKeys.appVersionFunnel('metric-test', 7), {
    ...fixture(),
    truncated: true,
  });
  render(
    <QueryClientProvider client={client}>
      <VersionsPanel appKey="metric-test" days={7} />
    </QueryClientProvider>,
  );
  expect(screen.getByText(insightsEn.totals_returned)).not.toBeNull();
  expect(screen.getByText('90')).not.toBeNull();
  expect(screen.queryByText('250.0%')).toBeNull();
});

test('window and stale state disclose actual UTC boundaries and refresh freshness', () => {
  render(
    <ObservationNotice
      updatedAt={1}
      stale
      window={{
        timezone: 'UTC',
        startDate: '2026-09-21',
        endDate: '2026-09-27',
        startInclusive: '2026-09-21T00:00:00Z',
        endExclusive: '2026-09-28T00:00:00Z',
        today: '2026-09-27',
        generatedAt: '2026-09-27T01:00:00Z',
        partialDay: true,
      }}
    />,
  );
  expect(screen.getByText(/2026-09-21 – 2026-09-27 \(UTC\)/)).not.toBeNull();
  expect(screen.getByText(insightsEn.stale_data)).not.toBeNull();
  expect(screen.getByText(/Updated /)).not.toBeNull();
});

test('package observations surface short retention and collection limits', () => {
  render(
    <PackageObservation
      row={{
        packageVersion: '1',
        requests: 100,
        percent: 100,
        peakDevices: 3,
        observedDays: 2,
        availableStart: '2026-09-26',
        availableEnd: '2026-09-27',
        expiredDays: 20,
        unavailableDays: 1,
        partial: true,
      }}
    />,
  );
  expect(screen.getByText('21 days missing')).not.toBeNull();
  expect(screen.getByText(insightsEn.package_partial)).not.toBeNull();
});
