import { Alert, Card, Select, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  observationBytes,
  observationNumber,
  observationPercent,
} from './release-insights-format';
import type {
  ArtifactInsight,
  ReleaseDelivery,
  ReleaseVersionInsight,
  RolloutInsight,
} from './release-insights-types';
import { useAppVersionFunnel } from './shared';

// Local bilingual strings keep this optional panel usable during a rolling
// frontend/backend deployment without changing the existing translation keys.
const en = {
  title: 'Release effectiveness',
  gray: 'Gray rollout hits (devices)',
  missing: 'No data',
  unavailable:
    'Release data is unavailable right now. Version data below is not affected.',
  upgrade: 'The server has not enabled this feature yet.',
  inference:
    'Device counts are deduplicated estimates and cannot be added across days or rules.',
  partial: 'Data for this day is incomplete; counts may be low.',
  expired: 'Data for this day has expired.',
  noGray: 'No gray rollout data yet.',
  day: 'Date (UTC)',
  rule: 'Native package / rule',
  exposed: 'Devices reached',
  hit: 'Hit',
  miss: 'Missed',
  unknown: 'Undetermined',
  rate: 'Hit rate',
  reasons: 'Why undetermined',
  status: 'Data status',
  hermes: 'HermesBase compilation and patch size',
  version: 'Version',
  outcome: 'Compilation outcome',
  base: 'Base version / bytecode',
  detail: 'Details',
  artifacts: 'Artifacts',
  empty: 'No artifacts yet',
  from: 'Source hash',
  format: 'Format / state',
  patch: 'Patch size',
  full: 'Full package size',
  reduction: 'Smaller than full bundle by',
  observedAt: 'Time (UTC)',
  distinction:
    '“Used” means the CLI used the HermesBase compile. The size saving compares the patch with the full bundle, not HermesBase alone.',
  offers: 'Updates returned by the server',
  offersNote:
    "One update check can return a patch, a full bundle and a gray version at once; counts overlap and don't mean the client downloaded anything.",
  target: 'Target',
  kind: 'Format',
  reason: 'Note',
  count: 'Count',
  requests: 'Requests',
  used: 'Used',
  rejected: 'Failed equivalence check',
  dumpFailed: 'Equivalence check failed',
  none: 'Not used',
  unreported: 'Not reported',
  observed: 'OK',
  limited: 'Incomplete',
  unknownStatus: 'No data',
  current: 'Main',
  experimental: 'Gray release',
  pending: 'Patch not ready yet',
  mismatch: 'Base package mismatch',
  noPatch: 'No patch',
};
const zh: typeof en = {
  title: '发布效果',
  gray: '灰度命中（设备数）',
  missing: '暂无数据',
  unavailable: '发布效果数据暂时不可用，不影响下方版本数据。',
  upgrade: '服务端尚未启用该功能。',
  inference: '设备数为去重估算值，不同日期或规则之间不能直接相加。',
  partial: '当天数据不完整，数量可能偏低。',
  expired: '该日期的数据已过期。',
  noGray: '暂无灰度数据。',
  day: '日期（UTC）',
  rule: '原生包 / 规则',
  exposed: '触达设备',
  hit: '命中',
  miss: '未命中',
  unknown: '无法判定',
  rate: '命中率',
  reasons: '无法判定的原因',
  status: '数据状态',
  hermes: 'HermesBase 编译与补丁大小',
  version: '目标版本',
  outcome: '编译结果',
  base: '基线版本 / 字节码',
  detail: '详情',
  artifacts: '产物',
  empty: '暂无产物',
  from: '来源 hash',
  format: '格式 / 状态',
  patch: '补丁大小',
  full: '整包大小',
  reduction: '比整包小',
  observedAt: '时间（UTC）',
  distinction:
    '「已采用」表示 CLI 使用了 HermesBase 的编译结果。体积对比的是补丁与整包，不单指 HermesBase 带来的缩减。',
  offers: '服务端返回的更新',
  offersNote:
    '一次检查更新可能同时返回增量、整包和灰度版本，次数有重叠，也不代表客户端已下载。',
  target: '目标',
  kind: '格式',
  reason: '说明',
  count: '次数',
  requests: '请求数',
  used: '已采用',
  rejected: '等价性校验未通过',
  dumpFailed: '等价性校验失败',
  none: '未采用',
  unreported: '未上报',
  observed: '正常',
  limited: '数据不完整',
  unknownStatus: '暂无数据',
  current: '主版本',
  experimental: '灰度版本',
  pending: '增量尚未生成',
  mismatch: '基包不匹配',
  noPatch: '无增量',
};

export const ReleaseInsightsPanel = ({
  appKey,
  days,
  isAdmin = false,
}: {
  appKey: string;
  days: number;
  /**
   * Administrators see why a Hermes base was dropped. Everyone else sees it
   * as "not used": the CLI fell back to a plain compile, the release is fine,
   * and a rejection so far has always been a gap in our own check -- not
   * something to put in front of a customer.
   */
  isAdmin?: boolean;
}) => {
  const { i18n } = useTranslation();
  const text = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh')
    ? zh
    : en;
  const query = useAppVersionFunnel(appKey, days);
  const dateSelectID = useId();
  const [selectedDate, setSelectedDate] = useState<string>();
  const insights = query.data?.releaseInsights;
  const day =
    insights?.days.find((item) => item.date === selectedDate) ??
    insights?.days[0];
  const number = (value: number | null | undefined) =>
    observationNumber(value, text.missing);
  const status = (value: string) => (
    <Tag>
      {value === 'observed'
        ? text.observed
        : value === 'partial'
          ? text.limited
          : text.unknownStatus}
    </Tag>
  );
  const name = (hash: string) =>
    insights?.versions.find((item) => item.hash === hash)?.name || hash;
  const rolloutColumns: ColumnsType<RolloutInsight> = [
    {
      title: text.rule,
      key: 'rule',
      width: 270,
      render: (_, row) => (
        <div>
          <div>
            {row.packageVersion} · {name(row.targetHash)}
          </div>
          <div className="text-xs text-gray-500">
            {row.rollout == null ? text.missing : `${row.rollout}%`} ·{' '}
            {row.algorithm}
          </div>
          <code className="text-xs">{row.id.slice(0, 12)}</code>
        </div>
      ),
    },
    { title: text.exposed, dataIndex: 'exposedDevices', render: number },
    { title: text.hit, dataIndex: 'hitDevices', render: number },
    { title: text.miss, dataIndex: 'missDevices', render: number },
    { title: text.unknown, dataIndex: 'unknownDevices', render: number },
    {
      title: text.rate,
      dataIndex: 'hitRate',
      render: (value: number | null) => observationPercent(value, text.missing),
    },
    {
      title: text.reasons,
      key: 'reasons',
      width: 220,
      render: (_, row) => (
        <div>
          <div>
            {text.requests}: {number(row.requests.unknown)}
          </div>
          <div className="text-xs">
            UUID: {number(row.requests.missingUUID)} · SDK:{' '}
            {number(row.requests.missingSDK)} · Rule:{' '}
            {number(row.requests.missingRule)}
          </div>
        </div>
      ),
    },
    { title: text.status, dataIndex: 'status', render: status },
  ];
  const artifactColumns: ColumnsType<ArtifactInsight> = [
    {
      title: text.from,
      dataIndex: 'fromHash',
      render: (value: string) => <code>{value}</code>,
    },
    {
      title: text.format,
      key: 'format',
      render: (_, row) => `${row.format} / ${row.state}`,
    },
    {
      title: text.patch,
      dataIndex: 'artifactBytes',
      render: (value: number | null) => observationBytes(value, text.missing),
    },
    {
      title: text.full,
      dataIndex: 'fullBytes',
      render: (value: number | null) => observationBytes(value, text.missing),
    },
    {
      title: text.reduction,
      dataIndex: 'reduction',
      render: (value: number | null) => observationPercent(value, text.missing),
    },
    { title: text.observedAt, dataIndex: 'observedAt' },
  ];
  const outcomes: Record<string, string> = {
    used: text.used,
    rejected: isAdmin ? text.rejected : text.none,
    'dump-failed': isAdmin ? text.dumpFailed : text.none,
    none: text.none,
    unreported: text.unreported,
  };
  const versionColumns: ColumnsType<ReleaseVersionInsight> = [
    {
      title: text.version,
      key: 'version',
      render: (_, row) => (
        <div>
          {row.name || row.hash}
          <div className="text-xs text-gray-500">{row.hash}</div>
        </div>
      ),
    },
    {
      title: text.outcome,
      dataIndex: 'hermesBaseOutcome',
      render: (value: string) => (
        <Tag>{outcomes[value] ?? text.unreported}</Tag>
      ),
    },
    {
      title: text.base,
      key: 'base',
      render: (_, row) =>
        `${row.baseVersionId ?? '—'} / ${row.bytecodeVersion ?? '—'}`,
    },
    ...(isAdmin
      ? [
          {
            title: text.detail,
            dataIndex: 'hermesBaseDetail',
            ellipsis: true,
          },
        ]
      : []),
    { title: text.artifacts, dataIndex: 'artifactStatus', render: status },
  ];
  const reasons: Record<string, string> = {
    response_artifacts_pending: text.pending,
    bundle_mismatch_observed: text.mismatch,
    no_patch_offered: text.noPatch,
  };
  const deliveryColumns: ColumnsType<ReleaseDelivery> = [
    { title: text.version, dataIndex: 'hash', render: name },
    {
      title: text.target,
      dataIndex: 'target',
      render: (value: string) =>
        value === 'exp' ? text.experimental : text.current,
    },
    { title: text.kind, dataIndex: 'kind' },
    {
      title: text.reason,
      dataIndex: 'reason',
      render: (value: string) => reasons[value] ?? value,
    },
    { title: text.count, dataIndex: 'count', render: number },
  ];
  return (
    <Card title={text.title} className="mb-4">
      <Spin spinning={query.isLoading}>
        {!insights || insights.status === 'unavailable' ? (
          <Alert
            showIcon
            type="info"
            message={
              query.isLoading
                ? '…'
                : query.error || insights?.status === 'unavailable'
                  ? text.unavailable
                  : text.upgrade
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="font-medium">{text.gray}</h3>
            <Alert showIcon type="info" message={text.inference} />
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={dateSelectID}>{text.day}</label>
              <Select
                id={dateSelectID}
                value={day?.date}
                onChange={setSelectedDate}
                options={insights.days.map((item) => ({
                  value: item.date,
                  label: item.date,
                }))}
                className="w-44"
              />
            </div>
            {day && (day.limited || day.status === 'partial') && (
              <Alert showIcon type="warning" message={text.partial} />
            )}
            {day?.status === 'expired' || day?.status === 'unavailable' ? (
              <Alert
                type="info"
                message={day.status === 'expired' ? text.expired : text.missing}
              />
            ) : (
              <Table
                rowKey="id"
                dataSource={day?.cohorts ?? []}
                columns={rolloutColumns}
                scroll={{ x: 1200 }}
                size="small"
                pagination={false}
                locale={{ emptyText: text.noGray }}
              />
            )}
            <h3 className="font-medium">{text.hermes}</h3>
            <Alert showIcon type="info" message={text.distinction} />
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
                    locale={{ emptyText: text.empty }}
                  />
                ),
              }}
            />
            <h3 className="font-medium">{text.offers}</h3>
            <p className="text-sm text-gray-500">{text.offersNote}</p>
            <Table
              rowKey="id"
              dataSource={day?.deliveries ?? []}
              columns={deliveryColumns}
              size="small"
              scroll={{ x: 800 }}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: text.missing }}
            />
          </div>
        )}
      </Spin>
    </Card>
  );
};
