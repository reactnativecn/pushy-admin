import { Alert, Card, Select, Spin, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildFunnelRows,
  computeFunnelRates,
  type FunnelRow,
  lagShares,
  servedTotal,
} from './logic';
import { HealthTag } from './overview-panel';
import {
  EmptyState,
  Footnote,
  formatInteger,
  formatPercent,
  formatShare,
  InsightsError,
  Question,
  StatTile,
  useAppVersionFunnel,
  VersionLabel,
} from './shared';
import type { LagBucket, ServedCounts } from './types';

const ALL = '__all__';

const LAG_LABEL_KEY: Record<LagBucket, string> = {
  lt1h: 'app_insights.lag_lt1h',
  '1h-6h': 'app_insights.lag_1h_6h',
  '6h-24h': 'app_insights.lag_6h_24h',
  '1d-3d': 'app_insights.lag_1d_3d',
  '3d-7d': 'app_insights.lag_3d_7d',
  gt7d: 'app_insights.lag_gt7d',
};

const ServedBreakdown = ({ served }: { served: ServedCounts }) => {
  const { t } = useTranslation();
  const parts: Array<[string, number]> = [
    [t('app_insights.served_hdiff'), served.hdiff],
    [t('app_insights.served_pdiff'), served.pdiff],
    [t('app_insights.served_full'), served.full],
    [t('app_insights.served_full_pending'), served.fullPending],
    [t('app_insights.served_exp'), served.exp],
  ];
  return (
    <div className="flex flex-col gap-0.5">
      {parts.map(([label, count]) => (
        <div key={label} className="flex justify-between gap-4">
          <span>{label}</span>
          <span className="tabular-nums">{formatInteger(count)}</span>
        </div>
      ))}
    </div>
  );
};

/** 下发 → 下载成功 → 激活 → 回滚 的漏斗条。 */
const FunnelBars = ({ row }: { row: FunnelRow }) => {
  const { t } = useTranslation();
  const steps: Array<{ label: string; value: number; alert?: boolean }> = [
    { label: t('app_insights.step_served'), value: row.servedTotal },
    {
      label: t('app_insights.step_downloaded'),
      value: row.events.downloadSuccess,
    },
    { label: t('app_insights.step_activated'), value: row.events.markSuccess },
    {
      label: t('app_insights.step_rolled_back'),
      value: row.events.rollback,
      alert: true,
    },
  ];
  const max = Math.max(...steps.map((step) => step.value), 1);
  return (
    <ul className="m-0 list-none p-0">
      {steps.map((step) => (
        <li
          key={step.label}
          className="grid grid-cols-[6rem_minmax(0,1fr)_5rem] items-center gap-2 py-1 text-sm"
        >
          <span className="text-gray-600">{step.label}</span>
          <span className="h-3 overflow-hidden rounded bg-gray-100">
            <span
              className={`block h-full rounded ${step.alert ? 'bg-red-500' : 'bg-primary'}`}
              style={{
                width: `${step.value > 0 ? Math.max((step.value / max) * 100, 1.5) : 0}%`,
              }}
            />
          </span>
          <span className="text-right tabular-nums">
            {formatInteger(step.value)}
          </span>
        </li>
      ))}
    </ul>
  );
};

const LagBars = ({
  title,
  buckets,
}: {
  title: string;
  buckets: FunnelRow['lag']['downloadSuccess'];
}) => {
  const { t } = useTranslation();
  const { total, shares } = lagShares(buckets);
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-600">
        {title}
        <span className="ml-1 font-normal text-gray-400">
          {t('app_insights.lag_total', { count: formatInteger(total) })}
        </span>
      </div>
      {total === 0 ? (
        <div className="text-xs text-gray-400">{t('app_insights.no_lag')}</div>
      ) : (
        <ul className="m-0 list-none p-0">
          {shares.map((share) => (
            <li
              key={share.bucket}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 py-0.5 text-xs"
            >
              <span className="text-gray-500">
                {t(LAG_LABEL_KEY[share.bucket])}
              </span>
              <span className="h-2 overflow-hidden rounded bg-gray-100">
                <span
                  className="block h-full rounded bg-primary"
                  style={{
                    width: `${Math.max(share.percent, share.count > 0 ? 2 : 0)}%`,
                  }}
                />
              </span>
              <span className="text-right tabular-nums text-gray-600">
                {formatShare(share.percent)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const VersionDetail = ({ row }: { row: FunnelRow }) => {
  const { t } = useTranslation();
  const packageRows = row.byPackage.map((item) => ({
    ...item,
    ...computeFunnelRates(item.events),
    servedTotal: servedTotal(item.served),
  }));
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">
            {t('app_insights.funnel_title')}
          </div>
          <FunnelBars row={row} />
          <div className="mt-1 text-xs text-gray-500">
            {t('app_insights.funnel_line', {
              downloadSuccess: formatPercent(row.downloadSuccessRate),
              activation: formatPercent(row.activationRate),
              rollback: formatPercent(row.rollbackRate),
            })}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">
            {t('app_insights.by_package_title')}
          </div>
          {packageRows.length === 0 ? (
            <div className="text-xs text-gray-400">
              {t('app_insights.no_package_rows')}
            </div>
          ) : (
            <Table
              size="small"
              rowKey="packageVersion"
              pagination={false}
              scroll={{ x: 'max-content' }}
              dataSource={packageRows}
              columns={[
                {
                  title: t('app_insights.col_package'),
                  dataIndex: 'packageVersion',
                },
                {
                  title: t('app_insights.col_served'),
                  dataIndex: 'servedTotal',
                  align: 'right',
                  render: (value: number, record) => (
                    <Tooltip title={<ServedBreakdown served={record.served} />}>
                      <span className="tabular-nums">
                        {formatInteger(value)}
                      </span>
                    </Tooltip>
                  ),
                },
                {
                  title: t('app_insights.col_downloaded'),
                  align: 'right',
                  render: (_, record) =>
                    formatInteger(record.events.downloadSuccess),
                },
                {
                  title: t('app_insights.col_activated'),
                  align: 'right',
                  render: (_, record) =>
                    formatInteger(record.events.markSuccess),
                },
                {
                  title: t('app_insights.col_failures'),
                  align: 'right',
                  render: (_, record) =>
                    record.failures > 0 ? (
                      <span className="text-red-500">
                        {formatInteger(record.failures)}
                      </span>
                    ) : (
                      '0'
                    ),
                },
                {
                  title: t('app_insights.col_rollback'),
                  align: 'right',
                  render: (_, record) =>
                    record.events.rollback > 0 ? (
                      <span className="text-red-500">
                        {formatInteger(record.events.rollback)}
                      </span>
                    ) : (
                      '0'
                    ),
                },
                {
                  title: t('app_insights.col_rollback_rate'),
                  align: 'right',
                  render: (_, record) => formatPercent(record.rollbackRate),
                },
              ]}
            />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label={t('app_insights.adopted_mark')}
            value={formatInteger(row.adopted.mark)}
            hint={
              row.coverage === null
                ? t('app_insights.coverage_no_dau')
                : t('app_insights.coverage_of_dau', {
                    percent: formatPercent(row.coverage),
                  })
            }
          />
          <StatTile
            label={t('app_insights.adopted_download')}
            value={formatInteger(row.adopted.download)}
            hint={t('app_insights.adopted_hint')}
          />
        </div>
        <LagBars
          title={t('app_insights.lag_download')}
          buckets={row.lag?.downloadSuccess}
        />
        <LagBars
          title={t('app_insights.lag_mark')}
          buckets={row.lag?.markSuccess}
        />
        <div className="text-xs text-gray-400">
          {t('app_insights.lag_footnote')}
        </div>
      </div>
    </div>
  );
};

export const VersionsPanel = ({
  appKey,
  days,
}: {
  appKey: string | undefined;
  days: number;
}) => {
  const { t } = useTranslation();
  const funnel = useAppVersionFunnel(appKey, days);
  const [versionFilter, setVersionFilter] = useState<string>(ALL);
  const [packageFilter, setPackageFilter] = useState<string>(ALL);

  const allRows = useMemo(() => buildFunnelRows(funnel.data), [funnel.data]);

  const versionOptions = useMemo(
    () => [
      { value: ALL, label: t('app_insights.filter_all_versions') },
      ...allRows.map((row) => ({
        value: row.hash,
        label: row.name
          ? `${row.name} (${row.hash.slice(0, 8)})`
          : `${t('app_insights.version_deleted')} (${row.hash.slice(0, 8)})`,
      })),
    ],
    [allRows, t],
  );
  const packageOptions = useMemo(() => {
    const packages = new Set<string>();
    for (const row of allRows) {
      for (const item of row.byPackage) packages.add(item.packageVersion);
    }
    return [
      { value: ALL, label: t('app_insights.filter_all_packages') },
      ...Array.from(packages)
        .sort()
        .map((value) => ({ value, label: value })),
    ];
  }, [allRows, t]);

  // 按原生包筛选时，下发和事件改用该包的分项；累计的 adopted / lag 没有包维度，原样保留。
  const rows = useMemo(() => {
    let filtered = allRows;
    if (versionFilter !== ALL) {
      filtered = filtered.filter((row) => row.hash === versionFilter);
    }
    if (packageFilter !== ALL) {
      filtered = filtered.flatMap((row) => {
        const item = row.byPackage.find(
          (entry) => entry.packageVersion === packageFilter,
        );
        if (!item) return [];
        return [
          {
            ...row,
            ...computeFunnelRates(item.events),
            served: item.served,
            events: item.events,
            servedTotal: servedTotal(item.served),
            byPackage: [item],
          },
        ];
      });
    }
    return filtered;
  }, [allRows, versionFilter, packageFilter]);

  const columns: ColumnsType<FunnelRow> = [
    {
      title: t('app_insights.col_version'),
      key: 'version',
      fixed: 'left',
      width: 200,
      render: (_, row) => <VersionLabel hash={row.hash} name={row.name} />,
    },
    {
      title: t('app_insights.col_health'),
      key: 'health',
      width: 70,
      render: (_, row) => <HealthTag health={row.health} />,
    },
    {
      title: t('app_insights.col_coverage'),
      key: 'coverage',
      width: 150,
      render: (_, row) =>
        row.coverage === null ? (
          <span className="text-gray-400">-</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
              <span
                className="block h-full rounded bg-primary"
                style={{ width: `${Math.min(row.coverage * 100, 100)}%` }}
              />
            </span>
            <span className="w-14 text-right tabular-nums">
              {formatPercent(row.coverage)}
            </span>
          </div>
        ),
    },
    {
      title: t('app_insights.col_served'),
      key: 'served',
      align: 'right',
      width: 90,
      render: (_, row) => (
        <Tooltip title={<ServedBreakdown served={row.served} />}>
          <span className="tabular-nums underline decoration-dotted decoration-gray-300 underline-offset-2">
            {formatInteger(row.servedTotal)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: t('app_insights.col_downloaded'),
      key: 'downloaded',
      align: 'right',
      width: 90,
      render: (_, row) => formatInteger(row.events.downloadSuccess),
    },
    {
      title: t('app_insights.col_activated'),
      key: 'activated',
      align: 'right',
      width: 90,
      render: (_, row) => formatInteger(row.events.markSuccess),
    },
    {
      title: t('app_insights.col_failures'),
      key: 'failures',
      align: 'right',
      width: 70,
      render: (_, row) =>
        row.failures > 0 ? (
          <span className="text-red-500">{formatInteger(row.failures)}</span>
        ) : (
          '0'
        ),
    },
    {
      title: t('app_insights.col_rollback'),
      key: 'rollback',
      align: 'right',
      width: 70,
      render: (_, row) =>
        row.events.rollback > 0 ? (
          <span className="text-red-500">
            {formatInteger(row.events.rollback)}
          </span>
        ) : (
          '0'
        ),
    },
    {
      title: t('app_insights.col_activation_rate'),
      key: 'activationRate',
      align: 'right',
      width: 80,
      render: (_, row) => formatPercent(row.activationRate),
    },
    {
      title: t('app_insights.col_rollback_rate'),
      key: 'rollbackRate',
      align: 'right',
      width: 80,
      render: (_, row) => formatPercent(row.rollbackRate),
    },
  ];

  const data = funnel.data;

  return (
    <div className="flex flex-col gap-4">
      {funnel.error ? <InsightsError error={funnel.error} /> : null}
      {data?.truncated && (
        <Alert
          type="info"
          showIcon
          message={t('app_insights.truncated', { count: data.versions.length })}
        />
      )}
      <Spin spinning={funnel.isLoading}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatTile
            label={t('app_insights.dau_today')}
            value={formatInteger(data?.dauToday ?? 0)}
            hint={t('app_insights.dau_today_hint')}
            live
          />
          <StatTile
            label={t('app_insights.versions_in_window')}
            value={formatInteger(allRows.length)}
            hint={
              data
                ? t('app_insights.window_utc', {
                    start: data.start,
                    end: data.end,
                  })
                : ''
            }
          />
          <StatTile
            label={t('app_insights.window_served')}
            value={formatInteger(
              allRows.reduce((sum, row) => sum + row.servedTotal, 0),
            )}
            hint={t('app_insights.window_served_hint')}
          />
          <StatTile
            label={t('app_insights.window_rollbacks')}
            value={formatInteger(
              allRows.reduce((sum, row) => sum + row.events.rollback, 0),
            )}
            hint={t('app_insights.window_rollbacks_hint')}
            tone={
              allRows.some((row) => row.health === 'critical')
                ? 'error'
                : allRows.some((row) => row.health === 'warning')
                  ? 'warning'
                  : undefined
            }
          />
        </div>
      </Spin>

      <Card
        size="small"
        title={t('app_insights.funnel_table_title')}
        extra={
          <div className="flex flex-wrap gap-2">
            <Select
              size="small"
              showSearch
              optionFilterProp="label"
              value={versionFilter}
              options={versionOptions}
              onChange={setVersionFilter}
              className="w-56"
            />
            <Select
              size="small"
              showSearch
              optionFilterProp="label"
              value={packageFilter}
              options={packageOptions}
              onChange={setPackageFilter}
              className="w-40"
            />
          </div>
        }
      >
        <Question>{t('app_insights.funnel_table_question')}</Question>
        <Spin spinning={funnel.isLoading}>
          {rows.length === 0 && !funnel.isLoading ? (
            <EmptyState height="h-40">
              {t(
                allRows.length === 0
                  ? 'app_insights.no_versions'
                  : 'app_insights.no_versions_match',
              )}
            </EmptyState>
          ) : (
            <Table
              size="small"
              rowKey="hash"
              columns={columns}
              dataSource={rows}
              pagination={rows.length > 20 ? { pageSize: 20 } : false}
              scroll={{ x: 'max-content' }}
              expandable={{
                expandedRowRender: (row) => <VersionDetail row={row} />,
              }}
            />
          )}
        </Spin>
        <Footnote>
          {t('app_insights.funnel_footnote', {
            hourlyFrom: data?.hourlyFrom ?? '-',
          })}
          {packageFilter !== ALL && (
            <> {t('app_insights.package_filter_note')}</>
          )}
        </Footnote>
      </Card>
    </div>
  );
};
