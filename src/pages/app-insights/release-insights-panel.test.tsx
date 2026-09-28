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
function show(releaseInsights?: ReleaseInsights, isAdmin = false) {
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
      <ReleaseInsightsPanel appKey="app" days={3} isAdmin={isAdmin} />
    </QueryClientProvider>,
  );
  return client;
}
test('older backend renders an upgrade message', () => {
  const client = show();
  expect(
    screen.getByText('The server has not enabled this feature yet.'),
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
      'Release data is unavailable right now. Version data below is not affected.',
    ),
  ).not.toBeNull();
  client.clear();
});
test('partial day and Hermes metadata render in Chinese with accessible day selector', async () => {
  await i18n.changeLanguage('zh-CN');
  const client = show(
    {
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
    },
    true,
  );
  expect(screen.getByText('已采用')).not.toBeNull();
  // 灰度发布与下发方式两张卡片各有一个日期选择和当日提示
  expect(screen.getAllByText('当天数据不完整，数量可能偏低。')).toHaveLength(2);
  expect(screen.getAllByRole('combobox', { name: '日期（UTC）' })).toHaveLength(
    2,
  );
  client.clear();
});

const rejectedVersion = (): ReleaseInsights => ({
  status: 'available',
  timezone: 'UTC',
  retentionDays: 14,
  artifactRetentionDays: 35,
  days: [],
  versions: [
    {
      hash: 'target',
      name: 'Build',
      bytecodeVersion: 98,
      baseVersionId: null,
      hermesBaseOutcome: 'rejected',
      hermesBaseDetail: 'Function<h> +72: DefineOwnById r3 vs r3',
      artifactStatus: 'unavailable',
      artifactsLimited: false,
      artifacts: [],
    },
  ],
});
test('customers do not see the HermesBase section at all', () => {
  const client = show(rejectedVersion());
  expect(
    screen.queryByText('HermesBase compilation and patch size'),
  ).toBeNull();
  expect(screen.queryByText('Not used')).toBeNull();
  expect(screen.queryByText('Failed equivalence check')).toBeNull();
  expect(screen.queryByText(/DefineOwnById/)).toBeNull();
  client.clear();
});
test('administrators still see why the base was dropped', () => {
  const client = show(rejectedVersion(), true);
  expect(screen.getByText('Failed equivalence check')).not.toBeNull();
  // antd can render a header cell twice (measure row); presence is the point
  expect(screen.getAllByText('Details').length).toBeGreaterThan(0);
  expect(screen.getAllByText(/DefineOwnById/).length).toBeGreaterThan(0);
  client.clear();
});
