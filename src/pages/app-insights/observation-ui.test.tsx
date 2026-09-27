import { afterEach, beforeEach, expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import '@/i18n';
import { insightsEn, insightsZh } from '@/i18n/insights-metrics';
import { metricsKeys } from '@/utils/query-keys';
import { buildFunnelRows, filterFunnelRows } from './logic';
import { ObservationNotice, RollbackObservation } from './observation-ui';
import { PackageObservation } from './traffic-panel';
import type { VersionFunnelResponse } from './types';
import { VersionDetail, VersionsPanel } from './versions-panel';

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
  days: 7, start: '2026-09-21', end: '2026-09-27', hourlyFrom: '2026-09-25', dauToday: 2,
  versions: [{
    hash: 'v1', name: 'V1', served: { hdiff: 0, pdiff: 0, full: 6, fullPending: 0, exp: 0 },
    events: { downloadSuccess: 5, downloadFail: 90, patchFail: 0, markSuccess: 10, rollback: 0 },
    adopted: { mark: 5, download: 5 }, lag: { downloadSuccess: null, markSuccess: null },
    byPackage: [{ packageVersion: '1.0', served: { hdiff: 0, pdiff: 0, full: 2, fullPending: 0, exp: 0 }, events: { downloadSuccess: 2, downloadFail: 0, patchFail: 0, markSuccess: 2, rollback: 0 } }],
  }],
});

test('metric language overrides have identical keys', () => {
  expect(Object.keys(insightsEn).sort()).toEqual(Object.keys(insightsZh).sort());
  expect(i18n.t('app_insights.hit_uptodate')).toBe('No update offered');
  expect(i18n.t('app_insights.view_versions')).toBe('Version events');
});

test('low rollback does not claim overall health and tiny samples are explicit', () => {
  const response = fixture();
  render(<RollbackObservation events={response.versions[0]!.events} />);
  expect(screen.getByText('Low rollback report share')).not.toBeNull();
  expect(screen.queryByText('Healthy')).toBeNull();
  cleanup();
  render(<RollbackObservation events={{ downloadSuccess: 0, downloadFail: 0, patchFail: 0, markSuccess: 3, rollback: 1 }} />);
  expect(screen.getByText('Insufficient rollback observations (4 / 10)')).not.toBeNull();
});

test('package-filtered details hide whole-version cumulative metrics', () => {
  const row = filterFunnelRows(buildFunnelRows(fixture()), 'v1', '1.0')[0]!;
  render(<VersionDetail row={row} />);
  expect(screen.getByText(insightsEn.retained_unavailable_package)).not.toBeNull();
  expect(screen.queryByText(insightsEn.retained_title)).toBeNull();
});

test('retained counts are rendered without a coverage or adoption percentage', () => {
  render(<VersionDetail row={buildFunnelRows(fixture())[0]!} />);
  expect(screen.getAllByText('≈ 5')).toHaveLength(2);
  expect(screen.queryByText('250.0%')).toBeNull();
  expect(screen.queryByText('Coverage')).toBeNull();
});

test('legacy table labels returned-version totals and keeps download failures visible', () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  clients.push(client);
  client.setQueryData(metricsKeys.appVersionFunnel('metric-test', 7), { ...fixture(), truncated: true });
  render(<QueryClientProvider client={client}><VersionsPanel appKey="metric-test" days={7} /></QueryClientProvider>);
  expect(screen.getByText(insightsEn.totals_returned)).not.toBeNull();
  expect(screen.getByText('90')).not.toBeNull();
  expect(screen.queryByText('250.0%')).toBeNull();
});

test('window and stale state disclose actual UTC boundaries and refresh freshness', () => {
  render(<ObservationNotice source="utc" updatedAt={1} stale window={{
    timezone: 'UTC', startDate: '2026-09-21', endDate: '2026-09-27',
    startInclusive: '2026-09-21T00:00:00Z', endExclusive: '2026-09-28T00:00:00Z',
    today: '2026-09-27', generatedAt: '2026-09-27T01:00:00Z', partialDay: true,
  }} />);
  expect(screen.getByText(/2026-09-21T00:00:00Z/)).not.toBeNull();
  expect(screen.getByText(insightsEn.stale_data)).not.toBeNull();
  expect(screen.getByText(/refreshes every minute/)).not.toBeNull();
});

test('package observations surface short retention and collection limits', () => {
  render(<PackageObservation row={{ packageVersion: '1', requests: 100, percent: 100, peakDevices: 3, observedDays: 2, availableStart: '2026-09-26', availableEnd: '2026-09-27', expiredDays: 20, unavailableDays: 1, partial: true }} />);
  expect(screen.getByText('20 expired days; 1 unavailable days')).not.toBeNull();
  expect(screen.getByText(insightsEn.package_partial)).not.toBeNull();
});
