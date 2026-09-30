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
  ReleaseVersionInsight,
  RolloutInsight,
} from './release-insights-types';
import { HeaderHint, useAppVersionFunnel } from './shared';

// Local bilingual strings keep this optional panel usable during a rolling
// frontend/backend deployment without changing the existing translation keys.
const en = {
  title: 'Release effectiveness',
  gray: 'Gray release',
  grayQuestion:
    'Whether each gray-release rule reaches the intended share of devices, by day.',
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
  rule: 'Native package → gray version',
  exposed: 'Devices reached',
  hit: 'Hit',
  miss: 'Missed',
  unknown: 'SDK too old',
  unknownHint:
    'These devices run an SDK too old to tell whether they are in the gray release. They still update normally; upgrading the SDK makes them countable.',
  rate: 'Target / actual hit rate',
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
  used: 'Used',
  rejected: 'Failed equivalence check',
  dumpFailed: 'Equivalence check failed',
  none: 'Not used',
  unreported: 'Not reported',
  observed: 'OK',
  limited: 'Incomplete',
  unknownStatus: 'No data',
};
const zh: typeof en = {
  title: '发布效果',
  gray: '灰度发布',
  grayQuestion: '各灰度规则每天实际命中了多少设备，是否接近设定比例。',
  missing: '暂无数据',
  unavailable: '发布效果数据暂时不可用，不影响下方版本数据。',
  upgrade: '服务端尚未启用该功能。',
  inference: '设备数为去重估算值，不同日期或规则之间不能直接相加。',
  partial: '当天数据不完整，数量可能偏低。',
  expired: '该日期的数据已过期。',
  noGray: '暂无灰度数据。',
  day: '日期（UTC）',
  rule: '原生包 → 灰度版本',
  exposed: '触达设备',
  hit: '命中',
  miss: '未命中',
  unknown: 'SDK 版本过低',
  unknownHint:
    '这些设备的 SDK 版本较低，无法统计是否命中灰度；不影响它们正常更新，升级 SDK 后即可统计。',
  rate: '设定 / 实际命中率',
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
  used: '已采用',
  rejected: '等价性校验未通过',
  dumpFailed: '等价性校验失败',
  none: '未采用',
  unreported: '未上报',
  observed: '正常',
  limited: '数据不完整',
  unknownStatus: '暂无数据',
};

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
  /** 只渲染其中一张卡片；不传则依次渲染全部。 */
  section?: ReleaseSection;
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
      render: (_, row) => (
        <div>
          <div>
            {row.packageVersion} → {name(row.targetHash)}
          </div>
        </div>
      ),
    },
    { title: text.exposed, dataIndex: 'exposedDevices', render: number },
    { title: text.hit, dataIndex: 'hitDevices', render: number },
    { title: text.miss, dataIndex: 'missDevices', render: number },
    {
      title: <HeaderHint label={text.unknown} hint={text.unknownHint} />,
      dataIndex: 'unknownDevices',
      render: number,
    },
    {
      title: text.rate,
      key: 'rate',
      render: (_, row) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.rollout == null ? text.missing : `${row.rollout}%`}
          <span className="mx-1 text-gray-400">/</span>
          {observationPercent(row.hitRate, text.missing)}
        </span>
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
        // bytecodeVersion 0: the bundle is plain JS, not Hermes bytecode
        `${row.baseVersionId ?? '—'} / ${row.bytecodeVersion === 0 ? 'JS' : (row.bytecodeVersion ?? '—')}`,
    },
    {
      title: text.detail,
      dataIndex: 'hermesBaseDetail',
      ellipsis: true,
    },
    { title: text.artifacts, dataIndex: 'artifactStatus', render: status },
  ];
  const unavailableMessage = (
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
  );
  const available = !!insights && insights.status !== 'unavailable';
  const dateSelect = (name: ReleaseSection) =>
    available && (
      <span className="flex items-center gap-2 text-sm font-normal">
        <label htmlFor={`${dateSelectID}-${name}`}>{text.day}</label>
        <Select
          id={`${dateSelectID}-${name}`}
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
        <Alert showIcon type="warning" message={text.partial} />
      )}
      {(day?.status === 'expired' || day?.status === 'unavailable') && (
        <Alert
          type="info"
          message={day.status === 'expired' ? text.expired : text.missing}
        />
      )}
    </>
  );
  const dayReadable =
    day?.status !== 'expired' && day?.status !== 'unavailable';
  const show = (name: ReleaseSection) => !section || section === name;
  // 旧服务端或数据不可用时只提示一次，放在第一张卡片的位置。
  if (!available) {
    return show('rollout') ? (
      <Card size="small" title={text.title}>
        <Spin spinning={query.isLoading}>{unavailableMessage}</Spin>
      </Card>
    ) : null;
  }
  return (
    <>
      {show('rollout') && (
        <Card size="small" title={text.gray} extra={dateSelect('rollout')}>
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm text-gray-500">{text.grayQuestion}</p>
            {dayNotice}
            {dayReadable && (
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
            <p className="m-0 text-xs text-gray-400">{text.inference}</p>
          </div>
        </Card>
      )}
      {show('hermes') && isAdmin && (
        <Card size="small" title={text.hermes}>
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm text-gray-500">{text.distinction}</p>
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
          </div>
        </Card>
      )}
    </>
  );
};
