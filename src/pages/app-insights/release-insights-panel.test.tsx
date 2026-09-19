import { afterEach, beforeEach, expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import '@/i18n';
import { metricsKeys } from '@/utils/query-keys';
import { ReleaseInsightsPanel } from './release-insights-panel';
import type { ReleaseInsights } from './release-insights-types';

beforeEach(async () => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  global.ShadowRoot = class {} as any;
  await i18n.changeLanguage('en');
});
afterEach(cleanup);
function show(releaseInsights?: ReleaseInsights) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(metricsKeys.appVersionFunnel('app', 3), {
    days: 3,
    versions: [],
    releaseInsights,
  });
  render(
    <QueryClientProvider client={client}>
      <ReleaseInsightsPanel appKey="app" days={3} />
    </QueryClientProvider>,
  );
  return client;
}
test('older backend renders an upgrade message', () => {
  const client = show();
  expect(
    screen.getByText('This backend has not enabled release insights yet.'),
  ).not.toBeNull();
  client.clear();
});
test('optional API failure renders without throwing', () => {
  const client = show({
    status: 'unavailable',
    timezone: 'UTC',
    retentionDays: 14,
    artifactRetentionDays: 35,
    days: [],
    versions: [],
  });
  expect(
    screen.getByText(
      'Release insights are unavailable. Existing version statistics remain below.',
    ),
  ).not.toBeNull();
  client.clear();
});
test('partial day and Hermes metadata render in Chinese with accessible day selector', async () => {
  await i18n.changeLanguage('zh-CN');
  const client = show({
    status: 'available',
    timezone: 'UTC',
    retentionDays: 14,
    artifactRetentionDays: 35,
    days: [
      {
        date: '2026-09-19',
        status: 'partial',
        limited: true,
        requests: 2,
        cohorts: [],
        deliveries: [],
      },
    ],
    versions: [
      {
        hash: 'target',
        name: 'Build',
        bytecodeVersion: 96,
        baseVersionId: 3,
        hermesBaseOutcome: 'used',
        hermesBaseDetail: 'verified',
        artifactStatus: 'unavailable',
        artifactsLimited: false,
        artifacts: [],
      },
    ],
  });
  expect(screen.getByText('已采用')).not.toBeNull();
  expect(
    screen.getByText('当日曾触及采集上限或部分观测不完整，数量可能偏低。'),
  ).not.toBeNull();
  expect(
    screen.getByRole('combobox', { name: '观测日期（UTC）' }),
  ).not.toBeNull();
  client.clear();
});
