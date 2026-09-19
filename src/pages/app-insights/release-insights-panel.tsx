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
  gray: 'Gray rollout: inferred device observations',
  missing: 'No available data',
  unavailable:
    'Release insights are unavailable. Existing version statistics remain below.',
  upgrade: 'This backend has not enabled release insights yet.',
  inference:
    'These are approximate, deduplicated device/installation observations, inferred from the returned rule and SDK algorithm. They do not confirm selection, download or activation. Do not add device counts across dates or rule groups.',
  partial:
    'This day reached a collection limit or has incomplete observations. Counts may be understated.',
  expired:
    'Device observations for this date are outside the retention window.',
  noGray:
    'No gray candidate was recorded in the available observations. This does not prove that gray rollout is disabled.',
  day: 'Observation date (UTC)',
  rule: 'Native package / effective rule',
  exposed: 'Exposed devices ≈',
  hit: 'Rule hits ≈',
  miss: 'Rule misses ≈',
  unknown: 'Unknown devices ≈',
  rate: 'Observed hit ratio',
  reasons: 'Unknown requests / missing fields',
  status: 'Data status',
  hermes: 'HermesBase compilation and artifact sizes',
  version: 'Version',
  outcome: 'Compilation outcome',
  base: 'Base version / bytecode',
  detail: 'Diagnostic detail',
  artifacts: 'Artifact observations',
  empty: 'No artifact observations yet',
  from: 'Source hash',
  format: 'Format / state',
  patch: 'Patch size',
  full: 'Full package size',
  reduction: 'Size reduction vs full',
  observedAt: 'Observed at (UTC)',
  distinction:
    '“Used” means the CLI adopted the HermesBase compile. Size reduction compares a patch with the full package; it is not the extra benefit caused by HermesBase. Artifact snapshots are independent of the selected day and expire after 35 days of inactivity. Only platform-worker artifacts are collected in this phase.',
  offers: 'Download options offered by the server',
  offersNote:
    'An individual response may offer both a patch and a full package, plus a gray candidate. Counts are non-exclusive offers, not actual client downloads. Fallback labels describe response-level evidence, not a proven client failure cause.',
  target: 'Response target',
  kind: 'Offered format',
  reason: 'Response evidence',
  count: 'Offer count',
  requests: 'Requests',
  used: 'Used',
  rejected: 'Rejected by equivalence check',
  dumpFailed: 'Equivalence check unavailable',
  none: 'Not used',
  unreported: 'Not reported',
  observed: 'Observed',
  limited: 'Partial',
  unknownStatus: 'Unavailable',
  current: 'Main',
  experimental: 'Gray candidate',
  pending: 'Response contains pending artifacts',
  mismatch: 'Bundle mismatch observed',
  noPatch: 'No patch offered',
};
const zh: typeof en = {
  title: '发布效果',
  gray: '灰度规则命中：设备观测',
  missing: '无可用数据',
  unavailable: '新增发布指标暂不可用；下方原有版本统计不受影响。',
  upgrade: '当前后端尚未启用新增发布指标。',
  inference:
    '以下为根据实际返回规则和 SDK 算法推算的去重设备／安装实例数，使用近似去重统计；不代表实际选择、下载或激活。不同日期、不同规则组的设备数不可直接相加。',
  partial: '当日曾触及采集上限或部分观测不完整，数量可能偏低。',
  expired: '该日期已超出设备观测保留窗口。',
  noGray: '可用观测中没有记录到灰度候选，不能据此断言没有开启灰度。',
  day: '观测日期（UTC）',
  rule: '原生包／实际规则',
  exposed: '触达设备 ≈',
  hit: '规则命中 ≈',
  miss: '规则未命中 ≈',
  unknown: '无法判定设备 ≈',
  rate: '观测命中比例',
  reasons: '无法判定请求／缺失字段',
  status: '数据状态',
  hermes: 'HermesBase 编译与差分体积',
  version: '目标版本',
  outcome: '编译结果',
  base: '基线版本／字节码版本',
  detail: '诊断详情',
  artifacts: '产物观测',
  empty: '尚无产物观测',
  from: '来源 hash',
  format: '格式／状态',
  patch: '补丁大小',
  full: '整包大小',
  reduction: '相对整包体积减少',
  observedAt: '观测时间（UTC）',
  distinction:
    '“已采用”只说明 CLI 采用了 HermesBase 编译结果。体积减少比较的是补丁与整包，不等于 HermesBase 单独带来的收益。产物快照不受上方日期筛选限制，35 天无新写入后过期；本阶段仅采集平台 worker 产物。',
  offers: '服务端提供的下载选项',
  offersNote:
    '同一响应可能同时提供补丁、整包和灰度候选；以下次数不互斥，也不是客户端实际下载次数。回退标签只描述响应层面的证据，不代表已确认的客户端失败原因。',
  target: '响应目标',
  kind: '提供格式',
  reason: '响应证据',
  count: '提供次数',
  requests: '请求数',
  used: '已采用',
  rejected: '等价性校验拒绝',
  dumpFailed: '无法完成等价性校验',
  none: '未采用',
  unreported: '未上报',
  observed: '已观测',
  limited: '部分数据',
  unknownStatus: '无可用数据',
  current: '主版本',
  experimental: '灰度候选',
  pending: '响应包含待生成产物',
  mismatch: '观测到基包指纹不匹配',
  noPatch: '未提供补丁',
};

export const ReleaseInsightsPanel = ({
  appKey,
  days,
}: {
  appKey: string;
  days: number;
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
    rejected: text.rejected,
    'dump-failed': text.dumpFailed,
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
    { title: text.detail, dataIndex: 'hermesBaseDetail', ellipsis: true },
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
