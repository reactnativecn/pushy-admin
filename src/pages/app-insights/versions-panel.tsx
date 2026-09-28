import { Alert, Card, Select, Spin, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildFunnelRows,
  computeFunnelRates,
  type FunnelRates,
  type FunnelRow,
  filterFunnelRows,
  lagShares,
  servedTotal,
  versionTotals,
} from './logic';
import {
  ObservationNotice,
  observedInteger,
  RollbackShare,
} from './observation-ui';
import {
  EmptyState,
  Footnote,
  formatInteger,
  formatShare,
  HeaderHint,
  InsightsError,
  Question,
  StatTile,
  useAppVersionFunnel,
  VersionLabel,
} from './shared';
import type {
  FunnelEventCounts,
  LagBucket,
  LagBuckets,
  ServedCounts,
} from './types';

const ALL = '__all__';
const LAG_LABEL_KEY: Record<LagBucket, string> = {
  lt1h: 'app_insights.lag_lt1h',
  '1h-6h': 'app_insights.lag_1h_6h',
  '6h-24h': 'app_insights.lag_6h_24h',
  '1d-3d': 'app_insights.lag_1d_3d',
  '3d-7d': 'app_insights.lag_3d_7d',
  gt7d: 'app_insights.lag_gt7d',
};

type EventRow = { served: ServedCounts; events: FunnelEventCounts } & Pick<
  FunnelRates,
  'health' | 'rollbackSamples'
>;

const ServedBreakdown = ({ served }: { served: ServedCounts }) => {
  const { t } = useTranslation();
  const parts: Array<[string, number]> = [
    [
      t('app_insights.served_with_hint', {
        label: t('app_insights.served_hdiff'),
        hint: t('app_insights.hdiff_hint'),
      }),
      served.hdiff,
    ],
    [
      t('app_insights.served_with_hint', {
        label: t('app_insights.served_pdiff'),
        hint: t('app_insights.pdiff_hint'),
      }),
      served.pdiff,
    ],
    [t('app_insights.served_full'), served.full],
    [t('app_insights.served_full_pending'), served.fullPending],
    [t('app_insights.served_exp'), served.exp],
  ];
  return (
    <div>
      {parts.map(([label, count]) => (
        <div key={label}>
          {label}: {formatInteger(count)}
        </div>
      ))}
    </div>
  );
};

const useEventColumns = <T extends EventRow>(): ColumnsType<T> => {
  const { t } = useTranslation();
  const fields: Array<[keyof FunnelEventCounts, string]> = [
    ['downloadSuccess', 'app_insights.col_downloaded'],
    ['downloadFail', 'app_insights.col_download_fail'],
    ['patchFail', 'app_insights.col_patch_fail'],
    ['markSuccess', 'app_insights.col_activated'],
    ['rollback', 'app_insights.col_rollback'],
  ];
  return [
    {
      title: (
        <HeaderHint
          label={t('app_insights.col_served')}
          hint={t('app_insights.served_hint')}
        />
      ),
      key: 'offered',
      align: 'right',
      render: (_, row) => (
        <Tooltip title={<ServedBreakdown served={row.served} />}>
          <span className="tabular-nums underline decoration-dotted">
            {formatInteger(servedTotal(row.served))}
          </span>
        </Tooltip>
      ),
    },
    ...fields.map(([key, label]) => ({
      title: t(label),
      key,
      align: 'right' as const,
      render: (_: unknown, row: T) => formatInteger(row.events[key]),
    })),
    {
      title: (
        <HeaderHint
          label={t('app_insights.col_health')}
          hint={t('app_insights.rollback_only')}
        />
      ),
      key: 'rollbackObservation',
      align: 'right',
      render: (_, row) => (
        <RollbackShare
          health={row.health}
          samples={row.rollbackSamples}
          count={row.events.rollback}
        />
      ),
    },
  ];
};

const LagTable = ({
  title,
  buckets,
}: {
  title: string;
  buckets: LagBuckets['downloadSuccess'];
}) => {
  const { t } = useTranslation();
  const { total, shares } = lagShares(buckets);
  return (
    <div>
      <h4>
        {title} {t('app_insights.lag_total', { count: formatInteger(total) })}
      </h4>
      {total > 0 ? (
        <Table
          size="small"
          rowKey="bucket"
          pagination={false}
          dataSource={shares}
          columns={[
            {
              title,
              key: 'bucket',
              render: (_, row) => t(LAG_LABEL_KEY[row.bucket]),
            },
            {
              title: t('app_insights.col_count'),
              dataIndex: 'count',
              align: 'right',
              render: formatInteger,
            },
            {
              title: t('app_insights.col_share'),
              dataIndex: 'percent',
              align: 'right',
              render: formatShare,
            },
          ]}
        />
      ) : (
        <EmptyState>{t('app_insights.no_observations')}</EmptyState>
      )}
    </div>
  );
};

export const VersionDetail = ({ row }: { row: FunnelRow }) => {
  const { t } = useTranslation();
  const packageRows = useMemo(
    () =>
      row.byPackage.map((item) => ({
        ...item,
        ...computeFunnelRates(item.events),
      })),
    [row.byPackage],
  );
  const packageColumns = useEventColumns<(typeof packageRows)[number]>();
  return (
    <div className="space-y-4">
      <Question>{t('app_insights.by_package_title')}</Question>
      <Table
        size="small"
        rowKey="packageVersion"
        pagination={false}
        scroll={{ x: 'max-content' }}
        dataSource={packageRows}
        columns={[
          { title: t('app_insights.col_package'), dataIndex: 'packageVersion' },
          ...packageColumns,
        ]}
      />
      {row.retained ? (
        <Card size="small" title={t('app_insights.retained_title')}>
          <Question>{t('app_insights.retained_scope')}</Question>
          <div className="grid gap-2 md:grid-cols-2">
            <StatTile
              label={t('app_insights.adopted_mark')}
              value={observedInteger(row.retained.mark)}
            />
            <StatTile
              label={t('app_insights.adopted_download')}
              value={observedInteger(row.retained.download)}
            />
          </div>
          <Footnote>{t('app_insights.retained_hint')}</Footnote>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <LagTable
              title={t('app_insights.lag_download')}
              buckets={row.retained.lag.downloadSuccess}
            />
            <LagTable
              title={t('app_insights.lag_mark')}
              buckets={row.retained.lag.markSuccess}
            />
          </div>
          <Footnote>{t('app_insights.lag_footnote')}</Footnote>
        </Card>
      ) : (
        <Alert
          type="info"
          message={t('app_insights.retained_unavailable_package')}
        />
      )}
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
  const [versionFilter, setVersionFilter] = useState(ALL);
  const [packageFilter, setPackageFilter] = useState(ALL);
  const allRows = useMemo(() => buildFunnelRows(funnel.data), [funnel.data]);
  const rows = useMemo(
    () =>
      filterFunnelRows(
        allRows,
        versionFilter === ALL ? undefined : versionFilter,
        packageFilter === ALL ? undefined : packageFilter,
      ),
    [allRows, versionFilter, packageFilter],
  );
  const totals = versionTotals(funnel.data);
  const eventColumns = useEventColumns<FunnelRow>();
  const packages = Array.from(
    new Set(
      allRows.flatMap((row) =>
        row.byPackage.map((item) => item.packageVersion),
      ),
    ),
  ).sort();
  const columns: ColumnsType<FunnelRow> = [
    {
      title: t('app_insights.col_version'),
      key: 'version',
      fixed: 'left',
      width: 220,
      render: (_, row) => <VersionLabel hash={row.hash} name={row.name} />,
    },
    ...eventColumns,
  ];
  return (
    <div className="space-y-4">
      {!!funnel.error && <InsightsError error={funnel.error} />}
      <ObservationNotice
        window={funnel.data?.window}
        updatedAt={funnel.dataUpdatedAt}
        stale={!!funnel.error && !!funnel.data}
      />
      <Question>
        {t(
          totals?.scope === 'all_observed'
            ? 'app_insights.totals_all'
            : 'app_insights.totals_returned',
        )}
      </Question>
      <Spin spinning={funnel.isLoading}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <StatTile
            label={t('app_insights.versions_in_window')}
            value={formatInteger(totals?.versionCount)}
          />
          <StatTile
            label={t('app_insights.window_served')}
            value={formatInteger(totals?.offeredTargets)}
            hint={t('app_insights.window_served_hint')}
          />
          <StatTile
            label={t('app_insights.window_rollbacks')}
            value={formatInteger(totals?.events.rollback)}
          />
        </div>
      </Spin>
      {totals?.unattributed && (
        <Footnote>
          {t('app_insights.totals_unattributed', {
            offers: formatInteger(totals.unattributedOffers),
            reports: formatInteger(
              Object.values(totals.unattributed).reduce(
                (sum, count) => sum + count,
                0,
              ),
            ),
          })}
        </Footnote>
      )}
      {funnel.data?.truncated && (
        <Alert
          type="info"
          showIcon
          message={t('app_insights.truncated', { count: allRows.length })}
        />
      )}
      <Card size="small" title={t('app_insights.funnel_table_title')}>
        <div className="mb-3 flex flex-wrap gap-2">
          <Select
            value={versionFilter}
            onChange={setVersionFilter}
            showSearch
            optionFilterProp="label"
            className="w-64"
            options={[
              { value: ALL, label: t('app_insights.filter_all_versions') },
              ...allRows.map((row) => ({
                value: row.hash,
                label: `${row.name ?? t('app_insights.version_deleted')} (${row.hash.slice(0, 8)})`,
              })),
            ]}
          />
          <Select
            value={packageFilter}
            onChange={setPackageFilter}
            showSearch
            optionFilterProp="label"
            className="w-48"
            options={[
              { value: ALL, label: t('app_insights.filter_all_packages') },
              ...packages.map((value) => ({ value, label: value })),
            ]}
          />
        </div>
        <Question>{t('app_insights.events_not_funnel')}</Question>
        <Spin spinning={funnel.isLoading}>
          {rows.length > 0 ? (
            <Table
              size="small"
              rowKey="hash"
              dataSource={rows}
              columns={columns}
              pagination={rows.length > 20 ? { pageSize: 20 } : false}
              scroll={{ x: 'max-content' }}
              expandable={{
                expandedRowRender: (row) => <VersionDetail row={row} />,
              }}
            />
          ) : (
            <EmptyState>
              {funnel.isLoading
                ? ''
                : t(
                    allRows.length
                      ? 'app_insights.no_versions_match'
                      : 'app_insights.no_observations',
                  )}
            </EmptyState>
          )}
        </Spin>
      </Card>
    </div>
  );
};
