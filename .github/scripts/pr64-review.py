from pathlib import Path
import hashlib
import shutil

# Exact blobs were read and reviewed before preparing these replacements.
expected = {
    'src/pages/app-insights/logic.ts': 'eccb7a956b85f5e060fcf467ab8604f49694aed4',
    'src/pages/app-insights/logic.test.ts': 'ad45596525f9ea714f5aa4f2026b85d28755e3f1',
    'src/pages/app-insights/observation-ui.tsx': 'f6268ebb02cc2200b0f631c72d4882d8c47a9546',
    'src/pages/app-insights/observation-ui.test.tsx': '27208f81596a18a7e823e7127bd1a64010e07ebc',
    'src/pages/app-insights/overview-panel.tsx': 'bdccc38bd2aa2efd7aa561cd0f9c45ef7358d707',
    'src/pages/app-insights/versions-panel.tsx': '4d8d96bd26a9523f900a89dec5e0be8849f4e3cd',
    'src/pages/app-insights/traffic-panel.tsx': 'b6f57ea942b72396082ba9b78d86da4cf57db652',
    'src/pages/app-insights/failures-panel.tsx': 'ba6f3fa765cd0aca504e867ae2f2df917d6724f6',
    'src/pages/app-insights/shared.tsx': '70f39f1e2f68b38e2028e0e6faed0c117a16ec1c',
    'src/constants/i18n-keys.ts': '5031d29bb7b556b75ed0c6a43de0edce8db0def2',
    'src/pages/admin-service-status/version-health-overview-panel.tsx': '542bda5153870edbd844fd79f098d59038938c83',
    'src/i18n/resources.ts': 'b633715e76bd0f5efaa67000b0318ae46a080583',
    'src/i18n/locales/en.json': '860f9cbf48e8eb552b1f73c054ba1b4166bf1759',
    'src/i18n/locales/zh-CN.json': '111d0d6446ba5fb9c59a2efb007577cf64e11063',
}
for path, sha in expected.items():
    data = Path(path).read_bytes()
    actual = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
    assert actual == sha, (path, actual, sha)

def replace(path, old, new):
    p = Path(path)
    s = p.read_text()
    assert s.count(old) == 1, (path, 'expected one match', s.count(old), old[:100])
    p.write_text(s.replace(old, new))

def write(path, text):
    p = Path(path)
    assert not p.exists(), f'{path} already exists'
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)

logic = 'src/pages/app-insights/logic.ts'
replace(logic, "import {\n  type AppEventBreakdownDay,", "import {\n  CRITICAL_ROLLBACK,\n  MIN_EVENT_SAMPLES,\n  WARNING_ROLLBACK,\n} from '../../constants/metric-thresholds';\nimport {\n  type AppEventBreakdownDay,")
replace(logic, 'export const MIN_EVENT_SAMPLES = 10;', 'export { MIN_EVENT_SAMPLES };')
replace(logic, 'rollbackRate >= 0.05', 'rollbackRate >= CRITICAL_ROLLBACK')
replace(logic, 'rollbackRate >= 0.01', 'rollbackRate >= WARNING_ROLLBACK')
replace(logic, 'export interface RankedItem {', '''/** A legacy zero UUID count may mean missing/expired collection, not zero
 * devices. An explicit observed zero is valid and participates in the mean. */
export const deviceObservationCount = (
  value: number | null | undefined,
  status?: ObservationStatus,
): number | null =>
  status === undefined && value === 0 ? null : observationCount(value, status);

export interface RankedItem {''')
replace(logic, '''    const dayHit = emptyHit();
    for (const outcome of HIT_OUTCOMES) {
      dayHit[outcome] = countOf(day.hit?.[outcome]);
      hit[outcome] += dayHit[outcome];
    }
    const dayRequests = observationCount(day.requests, day.requestsStatus);
    const dau = observationCount(day.dau, day.dauStatus);''', '''    const dayRequests = observationCount(day.requests, day.requestsStatus);
    const dayHit = emptyHit();
    // Ratios must share the same available request-day population. Hourly,
    // host and UUID observations remain separate, self-denominated series.
    if (dayRequests !== null) {
      for (const outcome of HIT_OUTCOMES) {
        dayHit[outcome] = countOf(day.hit?.[outcome]);
        hit[outcome] += dayHit[outcome];
      }
    }
    const dau = deviceObservationCount(day.dau, day.dauStatus);''')
replace(logic, '''export interface PackageTrafficSummary {
  packageVersion: string;
  requests: number;
  peakDevices: number | null;
  percent: number;''', '''export interface PackageTrafficSummary {
  packageVersion: string;
  requests: number | null;
  peakDevices: number | null;
  percent: number | null;''')
replace(logic, '''      const entry = packages.get(item.packageVersion) ?? {
        packageVersion: item.packageVersion,
        requests: 0,''', '''      const entry: PackageTrafficSummary = packages.get(item.packageVersion) ?? {
        packageVersion: item.packageVersion,
        requests: null,''')
replace(logic, '      entry.requests += countOf(item.requests);', '''      if (dayRequests !== null && validCount(item.requests)) {
        entry.requests = (entry.requests ?? 0) + item.requests;
      }''')
replace(logic, '    for (const item of day.refused ?? []) {', '    for (const item of dayRequests === null ? [] : day.refused ?? []) {')
replace(logic, '        percent: percentOf(entry.requests, requests),', '''        percent:
          entry.requests !== null && requests > 0
            ? percentOf(entry.requests, requests)
            : null,''')
replace(logic, '          right.requests - left.requests ||', '          (right.requests ?? 0) - (left.requests ?? 0) ||')
replace(logic, 'export const filterFunnelRows = (', '''/** Order only the returned candidates, without mutating cached API data. */
export const rankFunnelRows = (rows: readonly FunnelRow[]): FunnelRow[] => {
  const volume = (row: FunnelRow) =>
    row.servedTotal +
    Object.values(row.events).reduce((sum, value) => sum + countOf(value), 0);
  return [...rows].sort(
    (left, right) =>
      volume(right) - volume(left) ||
      (left.hash < right.hash ? -1 : left.hash > right.hash ? 1 : 0),
  );
};

export const filterFunnelRows = (''')
replace(logic, '''export interface BreakdownSummary {
  failures: number;''', '''export interface BreakdownSummary {
  totalDays: number;
  availableDays: number;
  unavailableDays: number;
  legacyDays: number;
  failures: number;''')
replace(logic, '''  let failures = 0;
  for (const day of days ?? []) {
    for (const item of day.byReason ?? []) {''', '''  let failures = 0;
  let availableDays = 0;
  let unavailableDays = 0;
  let legacyDays = 0;
  for (const day of days ?? []) {
    if (day.status === undefined) legacyDays += 1;
    const legacyHasReports = [
      ...(day.byReason ?? []),
      ...(day.byOS ?? []),
      ...(day.byCarrier ?? []),
    ].some((item) => validCount(item.count) && item.count > 0);
    // Availability belongs to the unfiltered bucket, not to the selected
    // version. Explicit unavailable always wins over leftover numeric fields.
    if (
      day.status === 'unavailable' ||
      (day.status !== 'observed' && !legacyHasReports)
    ) {
      unavailableDays += 1;
      continue;
    }
    availableDays += 1;
    for (const item of day.byReason ?? []) {''')
replace(logic, "      const reason = item.reason.startsWith('other:') ? 'other' : item.reason;", "      const parsed = parseFailureReason(item.reason);\n      const reason = parsed.kind === 'known' ? parsed.reason : 'other';")
replace(logic, '''  return {
    failures,
    reasons:''', '''  return {
    totalDays: days?.length ?? 0,
    availableDays,
    unavailableDays,
    legacyDays,
    failures,
    reasons:''')
replace(logic, "  | { kind: 'other'; detail: string } =>", "  | { kind: 'other' } =>")
replace(logic, ": { kind: 'other', detail: '' };", ": { kind: 'other' };")
write('src/constants/metric-thresholds.ts', '''// Shared by app insights and the service-status version report panel.
// These thresholds classify rollback report shares, not overall health.
export const CRITICAL_ROLLBACK = 0.05;
export const WARNING_ROLLBACK = 0.01;
export const MIN_EVENT_SAMPLES = 10;
''')
shared = 'src/pages/app-insights/shared.tsx'
replace(shared, "export const formatShare = (percent: number) => `${percent.toFixed(1)}%`;", '''export const formatShare = (percent: number | null | undefined) =>
  typeof percent === 'number' && Number.isFinite(percent)
    ? `${percent.toFixed(1)}%`
    : '-';''')
replace(shared, '''      return parsed.detail
        ? t('app_insights.reason_other_detail', { detail: parsed.detail })
        : t('app_insights.reason_other');''', "      return t('app_insights.reason_other');")
observation = 'src/pages/app-insights/observation-ui.tsx'
replace(observation, "import { computeFunnelRates, MIN_EVENT_SAMPLES } from './logic';", "import { FUNNEL_HEALTH_LABEL_KEY } from '@/constants/i18n-keys';\nimport { MIN_EVENT_SAMPLES } from '@/constants/metric-thresholds';\nimport type { BreakdownSummary, FunnelHealth } from './logic';")
replace(observation, "import type { FunnelEventCounts, ObservationWindow } from './types';", "import type { ObservationWindow } from './types';")
replace(observation, '''export const RollbackObservation = ({
  events,
}: {
  events: FunnelEventCounts;
}) => {
  const { t } = useTranslation();
  const rates = computeFunnelRates(events);
  const label =
    rates.health === null
      ? t('app_insights.insufficient_samples', {
          count: rates.rollbackSamples,
          minimum: MIN_EVENT_SAMPLES,
        })
      : t(
          rates.health === 'critical'
            ? 'app_insights.rollback_high'
            : rates.health === 'warning'
              ? 'app_insights.rollback_warning'
              : 'app_insights.rollback_low',
        );''', '''export const RollbackObservation = ({
  health,
  samples,
  count,
}: {
  health: FunnelHealth;
  samples: number;
  count: number;
}) => {
  const { t } = useTranslation();
  const label =
    health === null
      ? t('app_insights.insufficient_samples', {
          count: samples,
          minimum: MIN_EVENT_SAMPLES,
        })
      : t(FUNNEL_HEALTH_LABEL_KEY[health]);''')
replace(observation, "rates.health === 'critical'", "health === 'critical'")
replace(observation, "rates.health === 'warning'", "health === 'warning'")
replace(observation, '<ReportShare part={events.rollback} total={rates.rollbackSamples} />', '<ReportShare part={count} total={samples} />')
with open(observation, 'a') as f:
    f.write('''
export const BreakdownAvailability = ({
  summary,
}: {
  summary: Pick<BreakdownSummary, 'totalDays' | 'availableDays' | 'unavailableDays' | 'legacyDays'>;
}) => {
  const { t } = useTranslation();
  if (summary.totalDays === 0) return null;
  return (
    <div className="space-y-1 text-xs text-gray-500" role="status">
      {summary.availableDays === 0 && (
        <Alert type="warning" title={t('app_insights.breakdown_unavailable')} />
      )}
      <div>{t('app_insights.breakdown_availability', {
        available: summary.availableDays,
        total: summary.totalDays,
        unavailable: summary.unavailableDays,
      })}</div>
      {summary.legacyDays > 0 && (
        <div>{t('app_insights.breakdown_legacy_days', { days: summary.legacyDays })}</div>
      )}
    </div>
  );
};
''')
panel = 'src/pages/app-insights/overview-panel.tsx'
replace(panel, '  buildFunnelRows,', '  buildFunnelRows,\n  rankFunnelRows,')
replace(panel, '() => buildFunnelRows(funnel.data).slice(0, 5)', '() => rankFunnelRows(buildFunnelRows(funnel.data)).slice(0, 5)')
rollback = '<RollbackObservation health={row.health} samples={row.rollbackSamples} count={row.events.rollback} />'
replace(panel, '<RollbackObservation events={row.events} />', rollback)
versions = 'src/pages/app-insights/versions-panel.tsx'
replace(versions, '  buildFunnelRows,', '  buildFunnelRows,\n  computeFunnelRates,\n  type FunnelRates,')
replace(versions, 'type EventRow = { served: ServedCounts; events: FunnelEventCounts };', "type EventRow = { served: ServedCounts; events: FunnelEventCounts } & Pick<FunnelRates, 'health' | 'rollbackSamples'>;")
replace(versions, '<RollbackObservation events={row.events} />', rollback)
replace(versions, "  const packageColumns = useEventColumns<FunnelRow['byPackage'][number]>();", '''  const packageRows = useMemo(
    () => row.byPackage.map((item) => ({ ...item, ...computeFunnelRates(item.events) })),
    [row.byPackage],
  );
  const packageColumns = useEventColumns<(typeof packageRows)[number]>();''')
replace(versions, '        dataSource={row.byPackage}', '        dataSource={packageRows}')
traffic = 'src/pages/app-insights/traffic-panel.tsx'
replace(traffic, '{summary.requests > 0 ? (', '{summary.hourly.some((count) => count > 0) ? (')
failures = 'src/pages/app-insights/failures-panel.tsx'
replace(failures, "import { ObservationNotice, ReportShare } from './observation-ui';", "import { BreakdownAvailability, ObservationNotice, ReportShare } from './observation-ui';")
replace(failures, '''  keyTitle,
}: {
  rows: DimensionRow[];
  labelOf: (key: string) => string;
  keyTitle: string;''', '''  keyTitle,
  emptyText,
}: {
  rows: DimensionRow[];
  labelOf: (key: string) => string;
  keyTitle: string;
  emptyText: string;''')
replace(failures, "locale={{ emptyText: t('app_insights.no_observations') }}", 'locale={{ emptyText }}')
replace(failures, '''  const hasObservations =
    summary.os.length > 0 ||
    summary.reasons.length > 0 ||
    summary.carriers.length > 0;''', '''  const hasAvailableDays = summary.availableDays > 0;
  const emptyText = t(hasAvailableDays
    ? 'app_insights.no_reports_in_scope'
    : 'app_insights.breakdown_unavailable');''')
replace(failures, '''      <div className="flex flex-wrap items-center justify-between gap-2">''', '''      <BreakdownAvailability summary={summary} />
      <div className="flex flex-wrap items-center justify-between gap-2">''')
replace(failures, 'hasObservations ? summary.failures : null', 'hasAvailableDays ? summary.failures : null')
replace(failures, "                : t('app_insights.no_observations')\n", '                : emptyText\n')
replace(failures, "t('app_insights.no_ranked_os')", "hasAvailableDays ? t('app_insights.no_ranked_os') : emptyText")
replace(failures, "{breakdown.isLoading ? '' : t('app_insights.no_observations')}", "{breakdown.isLoading ? '' : emptyText}")
replace(failures, '''          rows={summary.os}
          keyTitle=''','''          rows={summary.os}
          emptyText={emptyText}
          keyTitle=''')
replace(failures, '''            rows={summary.carriers}
            keyTitle=''','''            rows={summary.carriers}
            emptyText={emptyText}
            keyTitle=''')
keys = 'src/constants/i18n-keys.ts'
replace(keys, '版本漏斗的健康标签（回滚率阈值判定，null 表示样本不足不判定）', '回滚报告占比标签（null 表示样本不足，不代表整体健康）')
for old,new in [('health_healthy','rollback_low'),('health_warning','rollback_warning'),('health_critical','rollback_high')]:
    replace(keys, 'app_insights.'+old, 'app_insights.'+new)
admin = 'src/pages/admin-service-status/version-health-overview-panel.tsx'
replace(admin, "import { adminApi } from '@/services/admin-api';", "import { CRITICAL_ROLLBACK, WARNING_ROLLBACK, MIN_EVENT_SAMPLES } from '@/constants/metric-thresholds';\nimport { adminApi } from '@/services/admin-api';")
replace(admin, '''// 阈值:回滚率 >5% 异常、>1% 关注;样本太少(<10)不判定
const CRITICAL_ROLLBACK = 0.05;
const WARNING_ROLLBACK = 0.01;
const MIN_SAMPLES = 10;

''', '')
replace(admin, 'row.startSamples < MIN_SAMPLES', 'row.startSamples < MIN_EVENT_SAMPLES')
unit = 'src/pages/app-insights/logic.test.ts'
replace(unit, 'keeps legacy positive observations and valid numeric zero days usable', 'keeps legacy positive device observations but does not invent observed zeroes')
replace(unit, '''      [day('2026-09-25', { dau: 10 }), day('2026-09-26')],
      '2026-09-27',
    );
    expect(result.averageDau).toBe(5);''', '''      [day('2026-09-25', { dau: 10 }), day('2026-09-26')],
      '2026-09-27',
    );
    expect(result.averageDau).toBe(10);
    expect(result.dauSampleDays).toBe(1);
    expect(result.daily[1]?.dau).toBeNull();''')
replace(unit, "      kind: 'other',\n      detail: '',", "      kind: 'other',")
uiTest = 'src/pages/app-insights/observation-ui.test.tsx'
replace(uiTest, "import { insightsEn, insightsZh } from '@/i18n/insights-metrics';", "import en from '@/i18n/locales/en.json';\nimport zhCN from '@/i18n/locales/zh-CN.json';")
replace(uiTest, 'const clients: QueryClient[] = [];', 'const insightsEn = en.app_insights;\nconst insightsZh = zhCN.app_insights;\nconst clients: QueryClient[] = [];')
replace(uiTest, 'metric language overrides have identical keys', 'canonical metric language catalogs have identical keys')
replace(uiTest, '  render(<RollbackObservation events={response.versions[0]!.events} />);', '''  const row = buildFunnelRows(response)[0]!;
  render(<RollbackObservation health={row.health} samples={row.rollbackSamples} count={row.events.rollback} />);''')
replace(uiTest, '''      events={{
        downloadSuccess: 0,
        downloadFail: 0,
        patchFail: 0,
        markSuccess: 3,
        rollback: 1,
      }}''', '''      health={null}
      samples={4}
      count={1}''')
for name in ['review-regressions.test.ts', 'review-availability.test.tsx']:
    destination = Path('src/pages/app-insights') / name
    assert not destination.exists(), destination
    shutil.copyfile(Path('.github/scripts/pr64-fixtures') / name, destination)
write('src/i18n/canonical-resources.test.ts', '''import { expect, test } from 'bun:test';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import { resources } from './resources';

test('runtime translations use canonical JSON without duplicate overrides', () => {
  expect(resources.en.translation).toBe(en);
  expect(resources['zh-CN'].translation).toBe(zhCN);
});
''')
