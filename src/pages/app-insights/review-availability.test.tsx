import { afterEach, beforeEach, expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import '@/i18n';
import { metricsKeys } from '@/utils/query-keys';
import { FailuresPanel } from './failures-panel';
import { summarizeBreakdown } from './logic';
import { BreakdownAvailability } from './observation-ui';
import type { AppEventBreakdownDay } from './types';

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
const day = (
  overrides: Partial<AppEventBreakdownDay> = {},
): AppEventBreakdownDay => ({
  date: '2026-09-26',
  byOS: [],
  byReason: [],
  byCarrier: [],
  ...overrides,
});
const show = (days: AppEventBreakdownDay[]) => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  clients.push(client);
  client.setQueryData(metricsKeys.appEventBreakdown('review-app', 7), {
    days,
    retentionDays: 35,
  });
  render(
    <QueryClientProvider client={client}>
      <FailuresPanel appKey="review-app" days={7} />
    </QueryClientProvider>,
  );
};
const failureTileValue = () =>
  screen
    .getByText(i18n.t('app_insights.failure_events', { days: 7 }))
    .parentElement?.parentElement?.querySelector('.text-2xl')?.textContent;

test('an entirely unavailable failure window renders unavailable, not zero or healthy', () => {
  show([
    day({
      status: 'unavailable',
      byReason: [
        {
          type: 'rollback',
          hash: 'v1',
          name: 'V1',
          reason: 'network',
          count: 500,
        },
      ],
    }),
  ]);
  expect(
    screen.getAllByText(i18n.t('app_insights.breakdown_unavailable')).length >
      0,
  ).toBe(true);
  expect(failureTileValue()).toBe('-');
  expect(screen.queryByText('500')).toBeNull();
});
test('explicit observed empty days render zero with available-day context', () => {
  show([day({ status: 'observed' })]);
  expect(failureTileValue()).toBe('0');
  expect(
    screen.queryByText(i18n.t('app_insights.breakdown_unavailable')),
  ).toBeNull();
  expect(
    screen.getAllByText(i18n.t('app_insights.no_reports_in_scope')).length > 0,
  ).toBe(true);
});
test('mixed availability keeps observed failures visible while explaining missing days', () => {
  show([
    day({ status: 'unavailable' }),
    day({
      status: 'observed',
      byReason: [
        {
          type: 'download_fail',
          hash: 'v1',
          name: 'V1',
          reason: 'network',
          count: 2,
        },
      ],
    }),
  ]);
  expect(failureTileValue()).toBe('2');
  expect(
    screen.getByText(
      i18n.t('app_insights.breakdown_availability', {
        available: 1,
        total: 2,
        unavailable: 1,
      }),
    ),
  ).not.toBeNull();
});
test('Chinese availability distinguishes legacy missing buckets from an empty filter', async () => {
  await i18n.changeLanguage('zh-CN');
  const summary = summarizeBreakdown(
    [
      day(),
      day({
        byOS: [
          {
            type: 'download_success',
            hash: 'v1',
            name: null,
            os: 'ios',
            count: 1,
          },
        ],
      }),
    ],
    'missing',
  );
  render(<BreakdownAvailability summary={summary} />);
  expect(
    screen.getByText(
      i18n.t('app_insights.breakdown_availability', {
        available: 1,
        total: 2,
        unavailable: 1,
      }),
    ),
  ).not.toBeNull();
  expect(
    screen.queryByText(i18n.t('app_insights.breakdown_unavailable')),
  ).toBeNull();
});
