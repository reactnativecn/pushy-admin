import { describe, expect, test } from 'bun:test';
import type { AuditLog } from '@/types';
import dayjs from '@/utils/dayjs';
import {
  AUDIT_DATE_RANGE_MAX_DAYS,
  buildAuditCsvRow,
  buildSearchText,
  getActionKey,
  getActionLabel,
  getActionMap,
  getActionOptions,
  getApiTokenLabel,
  getAuditCsvHeader,
  getDateRangePatch,
  getPreviewData,
  getStatusFilterOptions,
  getUserAgentSummary,
  isAuditDateDisabled,
  matchesDateRange,
  matchesStatusFilter,
  normalizePath,
  parseDateRange,
  parseStatusFilter,
} from './audit-logs.logic';

const t = (key: string) => key;

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const makeLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 42,
  method: 'post',
  path: '/app/7/version/create',
  statusCode: '200',
  createdAt: '2026-05-01T08:30:00.000Z',
  ...overrides,
});

describe('normalizePath / getActionKey', () => {
  test('replaces numeric segments with {id} and strips a trailing slash', () => {
    expect(normalizePath('/app/123/version/456')).toBe(
      '/app/{id}/version/{id}',
    );
    expect(normalizePath('/app/12/')).toBe('/app/{id}');
    expect(normalizePath('/user/login/')).toBe('/user/login');
    expect(normalizePath('/orders')).toBe('/orders');
  });

  test('does not touch digits that are part of a segment', () => {
    expect(normalizePath('/api-token/v2list')).toBe('/api-token/v2list');
  });

  test('getActionKey upper-cases the method', () => {
    expect(getActionKey('delete', '/app/9/binding/3')).toBe(
      'DELETE /app/{id}/binding/{id}',
    );
  });
});

describe('getActionMap / getActionLabel / getActionOptions', () => {
  const actionMap = getActionMap(t);

  test('maps known actions to their translation key', () => {
    expect(getActionLabel(actionMap, 'delete', '/app/3')).toBe(
      'audit_logs.action_delete_app',
    );
    expect(getActionLabel(actionMap, 'post', '/user/login')).toBe(
      'audit_logs.action_login',
    );
    expect(getActionLabel(actionMap, 'PUT', '/app/1/package/22')).toBe(
      'audit_logs.action_update_pkg',
    );
  });

  test('falls back to METHOD + raw path for unknown routes', () => {
    expect(getActionLabel(actionMap, 'get', '/unknown/path/1')).toBe(
      'GET /unknown/path/1',
    );
  });

  test('options are sorted by label and keyed by the action key', () => {
    const options = getActionOptions(actionMap);
    expect(options).toHaveLength(Object.keys(actionMap).length);
    const labels = options.map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(options.map((option) => option.value)).toContain('POST /user/login');
  });
});

describe('parseStatusFilter / matchesStatusFilter', () => {
  test('accepts known values and falls back to all', () => {
    expect(parseStatusFilter('success')).toBe('success');
    expect(parseStatusFilter('client-error')).toBe('client-error');
    expect(parseStatusFilter('server-error')).toBe('server-error');
    expect(parseStatusFilter('all')).toBe('all');
    expect(parseStatusFilter(null)).toBe('all');
    expect(parseStatusFilter('2xx')).toBe('all');
  });

  test('all matches everything, even a non-numeric status', () => {
    expect(matchesStatusFilter('abc', 'all')).toBe(true);
    expect(matchesStatusFilter('500', 'all')).toBe(true);
  });

  test('buckets by status code range', () => {
    expect(matchesStatusFilter('200', 'success')).toBe(true);
    expect(matchesStatusFilter('299', 'success')).toBe(true);
    expect(matchesStatusFilter('300', 'success')).toBe(false);
    expect(matchesStatusFilter('404', 'client-error')).toBe(true);
    expect(matchesStatusFilter('500', 'client-error')).toBe(false);
    expect(matchesStatusFilter('500', 'server-error')).toBe(true);
    expect(matchesStatusFilter('503', 'server-error')).toBe(true);
    expect(matchesStatusFilter('499', 'server-error')).toBe(false);
  });

  test('non-numeric status never matches a specific bucket', () => {
    expect(matchesStatusFilter('abc', 'success')).toBe(false);
    expect(matchesStatusFilter('', 'server-error')).toBe(false);
  });

  test('status filter options cover the four buckets', () => {
    expect(getStatusFilterOptions(t).map((option) => option.value)).toEqual([
      'all',
      'success',
      'client-error',
      'server-error',
    ]);
  });
});

describe('parseDateRange', () => {
  test('returns null when neither bound is present', () => {
    expect(parseDateRange(new URLSearchParams())).toBeNull();
  });

  test('parses both bounds', () => {
    const range = parseDateRange(
      new URLSearchParams({ start: '2026-01-01', end: '2026-01-31' }),
    );
    expect(range?.[0]?.format('YYYY-MM-DD')).toBe('2026-01-01');
    expect(range?.[1]?.format('YYYY-MM-DD')).toBe('2026-01-31');
  });

  test('drops an invalid bound but keeps the other', () => {
    const range = parseDateRange(
      new URLSearchParams({ start: 'not-a-date', end: '2026-01-31' }),
    );
    expect(range?.[0]).toBeNull();
    expect(range?.[1]?.format('YYYY-MM-DD')).toBe('2026-01-31');
  });

  test('single bound yields a half-open range', () => {
    const range = parseDateRange(new URLSearchParams({ start: '2026-02-01' }));
    expect(range?.[0]?.format('YYYY-MM-DD')).toBe('2026-02-01');
    expect(range?.[1]).toBeNull();
  });
});

describe('getPreviewData / getApiTokenLabel', () => {
  test('strips deps and commit, returns null when nothing is left', () => {
    expect(getPreviewData(undefined)).toBeNull();
    expect(
      getPreviewData({ deps: { a: '1' }, commit: { hash: 'x' } }),
    ).toBeNull();
    expect(
      getPreviewData({ deps: { a: '1' }, name: 'v1', rollout: 10 }),
    ).toEqual({ name: 'v1', rollout: 10 });
  });

  test('api token label shows name when present', () => {
    expect(getApiTokenLabel(undefined)).toBeUndefined();
    expect(getApiTokenLabel({ tokenSuffix: '' })).toBeUndefined();
    expect(getApiTokenLabel({ tokenSuffix: 'ab12' })).toBe('****ab12');
    expect(getApiTokenLabel({ name: 'ci', tokenSuffix: 'ab12' })).toBe(
      'ci(****ab12)',
    );
  });
});

describe('buildSearchText', () => {
  test('joins the searchable fields lower-cased', () => {
    const actionMap = getActionMap(t);
    const text = buildSearchText(
      actionMap,
      makeLog({
        ip: '10.0.0.1',
        userAgent: 'React-Native-Update-CLI/1.0.0',
        apiTokens: { name: 'CI', tokenSuffix: 'ZZ99' },
        data: { deps: {}, Name: 'Hotfix' },
      }),
    );
    expect(text).toContain('42');
    expect(text).toContain('audit_logs.action_create_hotfix');
    expect(text).toContain('/app/7/version/create');
    expect(text).toContain('10.0.0.1');
    expect(text).toContain('react-native-update-cli/1.0.0');
    expect(text).toContain('ci(****zz99)');
    expect(text).toContain('{"name":"hotfix"}');
    expect(text).toBe(text.toLowerCase());
  });

  test('skips empty optional fields', () => {
    const text = buildSearchText(getActionMap(t), makeLog());
    expect(text).toContain('{}');
    expect(text).not.toContain('undefined');
  });
});

describe('matchesDateRange', () => {
  const inside = '2026-03-10T12:00:00';
  const before = '2026-03-01T23:59:59';
  const after = '2026-03-20T00:00:01';

  test('no range or empty range matches everything', () => {
    expect(matchesDateRange(inside, null)).toBe(true);
    expect(matchesDateRange(inside, [null, null])).toBe(true);
  });

  test('closed range is inclusive of both days', () => {
    const range: [dayjs.Dayjs, dayjs.Dayjs] = [
      dayjs('2026-03-05'),
      dayjs('2026-03-15'),
    ];
    expect(matchesDateRange(inside, range)).toBe(true);
    expect(matchesDateRange('2026-03-05T00:00:00', range)).toBe(true);
    expect(matchesDateRange('2026-03-15T23:59:59', range)).toBe(true);
    expect(matchesDateRange(before, range)).toBe(false);
    expect(matchesDateRange(after, range)).toBe(false);
  });

  test('start-only and end-only ranges bound one side', () => {
    expect(matchesDateRange(inside, [dayjs('2026-03-05'), null])).toBe(true);
    expect(matchesDateRange(before, [dayjs('2026-03-05'), null])).toBe(false);
    expect(matchesDateRange(inside, [null, dayjs('2026-03-15')])).toBe(true);
    expect(matchesDateRange(after, [null, dayjs('2026-03-15')])).toBe(false);
  });
});

describe('isAuditDateDisabled', () => {
  const today = dayjs('2026-06-30T10:00:00');
  const daysAgo = (days: number) => today.subtract(days, 'day');

  test('null is never disabled', () => {
    expect(isAuditDateDisabled(null, null, today)).toBe(false);
  });

  test('future days and days older than the retention window are disabled', () => {
    expect(isAuditDateDisabled(today, null, today)).toBe(false);
    expect(isAuditDateDisabled(today.add(1, 'day'), null, today)).toBe(true);
    expect(
      isAuditDateDisabled(daysAgo(AUDIT_DATE_RANGE_MAX_DAYS), null, today),
    ).toBe(false);
    expect(
      isAuditDateDisabled(daysAgo(AUDIT_DATE_RANGE_MAX_DAYS + 1), null, today),
    ).toBe(true);
  });

  test('with only a start picked, the end must be within 180 days after it', () => {
    const start = daysAgo(185);
    const range: [dayjs.Dayjs, null] = [start, null];
    expect(isAuditDateDisabled(daysAgo(10), range, today)).toBe(false);
    expect(isAuditDateDisabled(start.add(180, 'day'), range, today)).toBe(
      false,
    );
    expect(isAuditDateDisabled(start.add(181, 'day'), range, today)).toBe(true);

    const recentStart = daysAgo(10);
    expect(
      isAuditDateDisabled(
        recentStart.subtract(1, 'day'),
        [recentStart, null],
        today,
      ),
    ).toBe(true);
  });

  test('with only an end picked, the start cannot be after it', () => {
    const end = daysAgo(10);
    const range: [null, dayjs.Dayjs] = [null, end];
    expect(isAuditDateDisabled(end, range, today)).toBe(false);
    expect(isAuditDateDisabled(end.subtract(1, 'day'), range, today)).toBe(
      false,
    );
    expect(isAuditDateDisabled(end.add(1, 'day'), range, today)).toBe(true);
  });

  test('a complete range does not restrict further', () => {
    expect(
      isAuditDateDisabled(daysAgo(3), [daysAgo(20), daysAgo(5)], today),
    ).toBe(false);
  });
});

describe('getDateRangePatch', () => {
  const start = dayjs('2026-01-01T00:00:00');

  test('clearing the picker clears both params and resets the page', () => {
    expect(getDateRangePatch(null)).toEqual({
      start: undefined,
      end: undefined,
      page: '1',
    });
  });

  test('a single bound is written as-is', () => {
    expect(getDateRangePatch([start, null])).toEqual({
      start: start.toISOString(),
      end: undefined,
      page: '1',
    });
  });

  test('a range within 180 days is kept', () => {
    const end = start.add(30, 'day');
    expect(getDateRangePatch([start, end])).toEqual({
      start: start.toISOString(),
      end: end.toISOString(),
      page: '1',
    });
  });

  test('a range longer than 180 days is clamped to start + 180', () => {
    const end = start.add(400, 'day');
    expect(getDateRangePatch([start, end])).toEqual({
      start: start.toISOString(),
      end: start.add(AUDIT_DATE_RANGE_MAX_DAYS, 'day').toISOString(),
      page: '1',
    });
  });
});

describe('getUserAgentSummary', () => {
  test('missing UA yields dashes', () => {
    expect(getUserAgentSummary(undefined)).toEqual({ browser: '-', os: '-' });
    expect(getUserAgentSummary('')).toEqual({ browser: '-', os: '-' });
  });

  test('CLI UA is reported as cli + version', () => {
    expect(getUserAgentSummary('react-native-update-cli/1.2.3')).toEqual({
      browser: 'cli 1.2.3',
      os: '-',
    });
    expect(getUserAgentSummary('react-native-update-cli')).toEqual({
      browser: 'cli',
      os: '-',
    });
  });

  test('browser UA is split into browser and os', () => {
    const summary = getUserAgentSummary(CHROME_UA);
    expect(summary.browser).toContain('Chrome');
    expect(summary.os).toContain('Windows');
  });
});

describe('buildAuditCsvRow / getAuditCsvHeader', () => {
  const actionMap = getActionMap(t);

  test('header has ten columns ending with API Key', () => {
    const header = getAuditCsvHeader(t);
    expect(header).toHaveLength(10);
    expect(header[0]).toBe('audit_logs.col_time');
    expect(header[9]).toBe('API Key');
  });

  test('row uses dashes for missing optional fields', () => {
    const log = makeLog();
    const row = buildAuditCsvRow(actionMap, log);
    expect(row).toEqual([
      dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      'audit_logs.action_create_hotfix',
      'POST',
      '/app/7/version/create',
      '200',
      '-',
      '-',
      '-',
      '-',
      '-',
    ]);
  });

  test('row serialises payload, UA, ip and api key', () => {
    const row = buildAuditCsvRow(
      actionMap,
      makeLog({
        data: { deps: { x: '1' }, name: 'v2' },
        userAgent: 'react-native-update-cli/2.0.0',
        ip: '1.2.3.4',
        apiTokens: { tokenSuffix: 'ab' },
      }),
    );
    expect(row[5]).toBe('{"name":"v2"}');
    expect(row[6]).toBe('cli 2.0.0');
    expect(row[7]).toBe('-');
    expect(row[8]).toBe('1.2.3.4');
    expect(row[9]).toBe('****ab');
  });
});
