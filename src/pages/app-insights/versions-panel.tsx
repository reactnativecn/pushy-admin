import { Alert, Card, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/helper';
import {
  buildFunnelRows,
  buildPackageRows,
  computeFunnelRates,
  type FunnelRates,
  type FunnelRow,
  lagShares,
  type PackageRow,
  servedTotal,
  summarizeTraffic,
  versionTotals,
} from './logic';
import {
  ObservationNotice,
  observedInteger,
  RollbackShare,
} from './observation-ui';
import { ReleaseInsightsPanel } from './release-insights-panel';
import {
  BarList,
  EmptyState,
  Footnote,
  formatInteger,
  formatShare,
  HeaderHint,
  InsightsError,
  Question,
  StatTile,
  useAppTraffic,
  useAppVersionFunnel,
  VersionLabel,
} from './shared';
import type {
  FunnelEventCounts,
  LagBucket,
  LagBuckets,
  ServedCounts,
} from './types';

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

interface FullReasons {
  mismatch: number;
  noPatch: number;
}

/** 下发方式：各格式的下发次数与占比；有记录时附上最近几天整包的原因。 */
const DeliveryBreakdown = ({
  served,
  fullReasons,
  reasonDays,
}: {
  served: ServedCounts;
  fullReasons?: FullReasons;
  reasonDays: number;
}) => {
  const { t } = useTranslation();
  const total = servedTotal(served);
  const hinted = (label: string, hint: string) => (
    <HeaderHint label={t(label)} hint={t(hint)} />
  );
  const parts: Array<[string, ReactNode, number]> = [
    [
      'hdiff',
      hinted('app_insights.served_hdiff', 'app_insights.hdiff_hint'),
      served.hdiff,
    ],
    [
      'pdiff',
      hinted('app_insights.served_pdiff', 'app_insights.pdiff_hint'),
      served.pdiff,
    ],
    ['full', t('app_insights.served_full'), served.full],
    ['fullPending', t('app_insights.served_full_pending'), served.fullPending],
    ['exp', t('app_insights.served_exp'), served.exp],
  ];
  const items = parts
    .filter(([, , count]) => count > 0)
    .map(([key, label, count]) => ({
      key,
      label,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
  const reasons = [
    fullReasons?.mismatch
      ? t('app_insights.full_reason_mismatch', {
          count: formatInteger(fullReasons.mismatch),
        })
      : null,
    fullReasons?.noPatch
      ? t('app_insights.full_reason_no_patch', {
          count: formatInteger(fullReasons.noPatch),
        })
      : null,
  ].filter(Boolean);
  return (
    <div>
      <Question>{t('app_insights.delivery_title')}</Question>
      {items.length > 0 ? (
        <BarList items={items} />
      ) : (
        <EmptyState height="h-12">
          {t('app_insights.no_observations')}
        </EmptyState>
      )}
      {reasons.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {t('app_insights.full_reasons', { days: reasonDays })}
          {reasons.join(' · ')}
        </div>
      )}
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
        <span className="tabular-nums">
          {formatInteger(servedTotal(row.served))}
        </span>
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

/** 原生包视角展开：这个原生包里各热更版本的事件。 */
const PackageDetail = ({ row }: { row: PackageRow }) => {
  const { t } = useTranslation();
  const eventColumns = useEventColumns<PackageRow['versions'][number]>();
  return (
    <Table
      size="small"
      rowKey="hash"
      pagination={false}
      scroll={{ x: 'max-content' }}
      dataSource={row.versions}
      columns={[
        {
          title: t('app_insights.col_version'),
          key: 'version',
          render: (_, item) => (
            <VersionLabel hash={item.hash} name={item.name} compact />
          ),
        },
        ...eventColumns,
      ]}
    />
  );
};

export const VersionDetail = ({
  row,
  fullReasons,
  reasonDays = 14,
}: {
  row: FunnelRow;
  fullReasons?: FullReasons;
  reasonDays?: number;
}) => {
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
      <DeliveryBreakdown
        served={row.served}
        fullReasons={fullReasons}
        reasonDays={reasonDays}
      />
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
      {row.retained && (
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
      )}
    </div>
  );
};

/**
 * 版本页从整体到细节：汇总 → 各版本数据 → 灰度发布 → 更新包下发方式 →
 * 原生包分布 →（管理员）HermesBase 诊断。
 */
export const VersionsPanel = ({
  appKey,
  days,
  isAdmin,
}: {
  appKey: string | undefined;
  days: number;
  isAdmin: boolean;
}) => {
  const { t } = useTranslation();
  const funnel = useAppVersionFunnel(appKey, days);
  const rows = useMemo(() => buildFunnelRows(funnel.data), [funnel.data]);
  // 整包原因只在发布效果的逐日数据里（保留 14 天），按版本汇总可读的日子。
  const { fullReasons, reasonDays } = useMemo(() => {
    const map = new Map<string, FullReasons>();
    const readable = (funnel.data?.releaseInsights?.days ?? []).filter(
      (day) => day.status !== 'expired' && day.status !== 'unavailable',
    );
    for (const day of readable) {
      for (const item of day.deliveries) {
        const entry = map.get(item.hash) ?? { mismatch: 0, noPatch: 0 };
        if (item.reason === 'bundle_mismatch_observed') {
          entry.mismatch += item.count;
        } else if (item.reason === 'no_patch_offered') {
          entry.noPatch += item.count;
        }
        map.set(item.hash, entry);
      }
    }
    return { fullReasons: map, reasonDays: readable.length };
  }, [funnel.data]);
  const traffic = useAppTraffic(appKey, days);
  const [perspective, setPerspective] = useState<'version' | 'package'>(
    'version',
  );
  const packageRows = useMemo(
    () =>
      buildPackageRows(
        rows,
        summarizeTraffic(traffic.data?.days, traffic.data?.window?.today)
          .packages,
      ),
    [rows, traffic.data],
  );
  const packageEventColumns = useEventColumns<PackageRow>();
  // 视角切换放在第一列表头，切换后表格的行随之变成热更版本或原生包。
  const perspectiveToggle = (
    <div className="flex gap-5" role="tablist">
      {(['version', 'package'] as const).map((value) => {
        const active = perspective === value;
        const label = t(
          value === 'version'
            ? 'app_insights.by_version'
            : 'app_insights.by_package',
        );
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setPerspective(value)}
            className={cn(
              '-mb-2 cursor-pointer whitespace-nowrap border-0 border-b-2 border-solid bg-transparent px-0 pb-1.5 text-[15px]',
              active
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent font-normal text-gray-400 hover:text-gray-600',
            )}
          >
            {active
              ? t('app_insights.perspective_active', { name: label })
              : label}
          </button>
        );
      })}
    </div>
  );
  const packageColumns: ColumnsType<PackageRow> = [
    {
      title: perspectiveToggle,
      dataIndex: 'packageVersion',
      fixed: 'left',
      width: 300,
    },
    {
      title: t('app_insights.requests'),
      key: 'requests',
      align: 'right',
      render: (_, row) => (
        <span className="tabular-nums">
          {formatInteger(row.requests)}
          {row.percent !== null && (
            <span className="ml-1 text-xs text-gray-400">
              {formatShare(row.percent)}
            </span>
          )}
        </span>
      ),
    },
    {
      title: (
        <HeaderHint
          label={t('app_insights.col_peak_devices')}
          hint={t('app_insights.peak_devices_hint')}
        />
      ),
      dataIndex: 'peakDevices',
      align: 'right',
      render: observedInteger,
    },
    ...packageEventColumns,
  ];
  const totals = versionTotals(funnel.data);
  const eventColumns = useEventColumns<FunnelRow>();
  const columns: ColumnsType<FunnelRow> = [
    {
      title: perspectiveToggle,
      key: 'version',
      fixed: 'left',
      width: 300,
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
      <Spin spinning={funnel.isLoading}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
          message={t('app_insights.truncated', { count: rows.length })}
        />
      )}
      <Card size="small" title={t('app_insights.funnel_table_title')}>
        <Spin spinning={funnel.isLoading || traffic.isLoading}>
          {perspective === 'package' ? (
            <Table
              size="small"
              rowKey="packageVersion"
              rowClassName="cursor-pointer"
              dataSource={packageRows}
              columns={packageColumns}
              pagination={packageRows.length > 20 ? { pageSize: 20 } : false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: t('app_insights.no_observations') }}
              expandable={{
                expandRowByClick: true,
                rowExpandable: (row) => row.versions.length > 0,
                expandedRowRender: (row) => <PackageDetail row={row} />,
              }}
            />
          ) : (
            <Table
              size="small"
              rowKey="hash"
              rowClassName="cursor-pointer"
              dataSource={rows}
              columns={columns}
              pagination={rows.length > 20 ? { pageSize: 20 } : false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: t('app_insights.no_observations') }}
              expandable={{
                expandRowByClick: true,
                expandedRowRender: (row) => (
                  <VersionDetail
                    row={row}
                    fullReasons={fullReasons.get(row.hash)}
                    reasonDays={reasonDays}
                  />
                ),
              }}
            />
          )}
        </Spin>
        <Footnote>{t('app_insights.events_not_funnel')}</Footnote>
      </Card>
      {appKey && (
        <ReleaseInsightsPanel
          appKey={appKey}
          days={days}
          isAdmin={isAdmin}
          section="rollout"
        />
      )}
      {appKey && (
        <ReleaseInsightsPanel
          appKey={appKey}
          days={days}
          isAdmin={isAdmin}
          section="hermes"
        />
      )}
    </div>
  );
};
