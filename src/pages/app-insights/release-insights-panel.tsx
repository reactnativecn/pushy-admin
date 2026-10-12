import { Alert, Card, Select, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes, formatCount, formatPercent } from '@/utils/format';
import type {
  ArtifactInsight,
  ReleaseVersionInsight,
  RolloutInsight,
} from './release-insights-types';
import { HeaderHint, useAppVersionFunnel } from './shared';

export type ReleaseSection = 'rollout' | 'hermes';

export const ReleaseInsightsPanel = ({
  appKey,
  days,
  isAdmin = false,
  section,
}: {
  appKey: string;
  days: number;
  /**
   * Only administrators see the HermesBase compilation and artifact size
   * section. It is a diagnostic view of our own build pipeline: customers
   * cannot act on it, and a dropped base means the CLI fell back to a plain
   * compile while the release itself is fine.
   */
  isAdmin?: boolean;
  /** 渲染哪一张卡片：版本页把两张卡片放在不同位置。 */
  section: ReleaseSection;
}) => {
  const { t } = useTranslation();
  const missing = t('release_insights.missing');
  const query = useAppVersionFunnel(appKey, days);
  const dateSelectID = useId();
  const [selectedDate, setSelectedDate] = useState<string>();
  const insights = query.data?.releaseInsights;
  const day =
    insights?.days.find((item) => item.date === selectedDate) ??
    insights?.days[0];
  const number = (value: number | null | undefined) =>
    formatCount(value, missing);
  // 0 字节不是「免费补丁」而是没测到，同样按缺失显示
  const bytes = (value: number | null) =>
    value && value > 0 ? formatBytes(value, missing) : missing;
  const status = (value: string) => (
    <Tag>
      {value === 'observed'
        ? t('release_insights.status_observed')
        : value === 'partial'
          ? t('release_insights.status_limited')
          : t('release_insights.status_unknown')}
    </Tag>
  );
  const name = (hash: string) =>
    insights?.versions.find((item) => item.hash === hash)?.name || hash;
  const rolloutColumns: ColumnsType<RolloutInsight> = [
    {
      title: t('release_insights.rule'),
      key: 'rule',
      render: (_, row) => (
        <div>
          <div>
            {row.packageVersion} → {name(row.targetHash)}
          </div>
        </div>
      ),
    },
    {
      title: t('release_insights.exposed'),
      dataIndex: 'exposedDevices',
      render: number,
    },
    {
      title: t('release_insights.hit'),
      dataIndex: 'hitDevices',
      render: number,
    },
    {
      title: t('release_insights.miss'),
      dataIndex: 'missDevices',
      render: number,
    },
    {
      title: (
        <HeaderHint
          label={t('release_insights.unknown')}
          hint={t('release_insights.unknown_hint')}
        />
      ),
      dataIndex: 'unknownDevices',
      render: number,
    },
    {
      title: t('release_insights.rate'),
      key: 'rate',
      render: (_, row) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.rollout == null ? missing : `${row.rollout}%`}
          <span className="mx-1 text-gray-400">/</span>
          {formatPercent(row.hitRate, 1, missing)}
        </span>
      ),
    },
    {
      title: t('release_insights.status'),
      dataIndex: 'status',
      render: status,
    },
  ];
  const artifactColumns: ColumnsType<ArtifactInsight> = [
    {
      title: t('release_insights.from'),
      dataIndex: 'fromHash',
      render: (value: string) => <code>{value}</code>,
    },
    {
      title: t('release_insights.format'),
      key: 'format',
      render: (_, row) => `${row.format} / ${row.state}`,
    },
    {
      title: t('release_insights.patch'),
      dataIndex: 'artifactBytes',
      render: bytes,
    },
    {
      title: t('release_insights.full'),
      dataIndex: 'fullBytes',
      render: bytes,
    },
    {
      title: t('release_insights.reduction'),
      dataIndex: 'reduction',
      render: (value: number | null) => formatPercent(value, 1, missing),
    },
    { title: t('release_insights.observed_at'), dataIndex: 'observedAt' },
  ];
  const outcomes: Record<string, string> = {
    used: t('release_insights.outcome_used'),
    rejected: t('release_insights.outcome_rejected'),
    'dump-failed': t('release_insights.outcome_dump_failed'),
    none: t('release_insights.outcome_none'),
    unreported: t('release_insights.outcome_unreported'),
  };
  const versionColumns: ColumnsType<ReleaseVersionInsight> = [
    {
      title: t('release_insights.version'),
      key: 'version',
      render: (_, row) => (
        <div>
          {row.name || row.hash}
          <div className="text-xs text-gray-500">{row.hash}</div>
        </div>
      ),
    },
    {
      title: t('release_insights.outcome'),
      dataIndex: 'hermesBaseOutcome',
      render: (value: string) => (
        <Tag>{outcomes[value] ?? t('release_insights.outcome_unreported')}</Tag>
      ),
    },
    {
      title: t('release_insights.base'),
      key: 'base',
      render: (_, row) =>
        // bytecodeVersion 0: the bundle is plain JS, not Hermes bytecode
        `${row.baseVersionId ?? '—'} / ${row.bytecodeVersion === 0 ? 'JS' : (row.bytecodeVersion ?? '—')}`,
    },
    {
      title: t('release_insights.detail'),
      dataIndex: 'hermesBaseDetail',
      ellipsis: true,
    },
    {
      title: t('release_insights.artifacts'),
      dataIndex: 'artifactStatus',
      render: status,
    },
  ];
  const unavailableMessage = (
    <Alert
      showIcon
      type="info"
      message={
        query.isLoading
          ? '…'
          : query.error || insights?.status === 'unavailable'
            ? t('release_insights.unavailable')
            : t('release_insights.upgrade')
      }
    />
  );
  const available = !!insights && insights.status !== 'unavailable';
  const dateSelect = available && (
    <span className="flex items-center gap-2 text-sm font-normal">
      <label htmlFor={dateSelectID}>{t('release_insights.day')}</label>
      <Select
        id={dateSelectID}
        size="small"
        value={day?.date}
        onChange={setSelectedDate}
        options={insights.days.map((item) => ({
          value: item.date,
          label: item.date,
        }))}
        className="w-36"
      />
    </span>
  );
  const dayNotice = (
    <>
      {day && (day.limited || day.status === 'partial') && (
        <Alert
          showIcon
          type="warning"
          message={t('release_insights.partial')}
        />
      )}
      {(day?.status === 'expired' || day?.status === 'unavailable') && (
        <Alert
          type="info"
          message={
            day.status === 'expired' ? t('release_insights.expired') : missing
          }
        />
      )}
    </>
  );
  const dayReadable =
    day?.status !== 'expired' && day?.status !== 'unavailable';
  // 旧服务端或数据不可用时只提示一次，放在灰度卡片的位置。
  if (!available) {
    return section === 'rollout' ? (
      <Card size="small" title={t('release_insights.title')}>
        <Spin spinning={query.isLoading}>{unavailableMessage}</Spin>
      </Card>
    ) : null;
  }
  if (section === 'hermes') {
    return isAdmin ? (
      <Card size="small" title={t('release_insights.hermes')}>
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-gray-500">
            {t('release_insights.distinction')}
          </p>
          <Table
            rowKey="hash"
            dataSource={insights.versions}
            columns={versionColumns}
            scroll={{ x: 950 }}
            size="small"
            pagination={{ pageSize: 10 }}
            expandable={{
              expandedRowRender: (row) => (
                <Table
                  rowKey="key"
                  dataSource={row.artifacts}
                  columns={artifactColumns}
                  size="small"
                  scroll={{ x: 1000 }}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: t('release_insights.empty') }}
                />
              ),
            }}
          />
        </div>
      </Card>
    ) : null;
  }
  return (
    <Card size="small" title={t('release_insights.gray')} extra={dateSelect}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm text-gray-500">
          {t('release_insights.gray_question')}
        </p>
        {dayNotice}
        {dayReadable && (
          <Table
            rowKey="id"
            dataSource={day?.cohorts ?? []}
            columns={rolloutColumns}
            scroll={{ x: 1200 }}
            size="small"
            pagination={false}
            locale={{ emptyText: t('release_insights.no_gray') }}
          />
        )}
        <p className="m-0 text-xs text-gray-400">
          {t('release_insights.inference')}
        </p>
      </div>
    </Card>
  );
};
