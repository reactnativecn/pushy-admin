import {
  CloudUploadOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/admin-api';
import type { SystemDeployStatus, SystemInstance } from '@/types';
import { adminKeys } from '@/utils/query-keys';
import { formatBytes, formatUptime, type ServiceStatusTarget } from './metrics';

const { Text } = Typography;

interface InstanceRow extends SystemInstance {
  deployStatus?: SystemDeployStatus;
}

const ROLE_COLORS: Record<string, string> = {
  server: 'blue',
  worker: 'purple',
  'fc-worker': 'geekblue',
};

const DEPLOY_STATUS_COLORS: Record<SystemDeployStatus['status'], string> = {
  installing: 'processing',
  restarting: 'warning',
  failed: 'error',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export function InstancesPanel({ target }: { target: ServiceStatusTarget }) {
  const { t } = useTranslation();
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  // 实例状态是节点本机事实（文件注册表），直接问该节点自己的入口
  const instancesQuery = useQuery({
    queryKey: adminKeys.systemInstances(target.key),
    queryFn: () => adminApi.getSystemInstances(target.baseUrl),
    refetchInterval: 10_000,
  });
  const npmQuery = useQuery({
    queryKey: adminKeys.systemNpm(target.key),
    queryFn: () => adminApi.getSystemNpmInfo(target.baseUrl),
    refetchInterval: 60_000,
  });
  const latestVersion = npmQuery.data?.distTags?.latest;

  const rows = useMemo(() => {
    const instances = instancesQuery.data?.data ?? [];
    const deployStatuses = instancesQuery.data?.deployStatuses ?? {};
    return instances
      .map((instance) => ({
        ...instance,
        deployStatus: deployStatuses[instance.id],
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }, [instancesQuery.data]);

  // 更新/回滚是节点级的：bun i -g 全局装一次，server/worker 一起滚动重启
  const nodeVersion =
    rows.find((row) => row.role === 'server')?.version ?? rows[0]?.version;

  const restartMutation = useMutation({
    mutationFn: (instanceId: string) =>
      adminApi.restartInstance({ instanceId, baseUrl: target.baseUrl }),
    onSuccess: () => {
      message.success(t('admin_deploy.command_queued'));
      setTimeout(() => instancesQuery.refetch(), 1000);
    },
    onError: (error) => {
      message.error((error as Error).message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (version: string) =>
      adminApi.updateNode({ version, baseUrl: target.baseUrl }),
    onSuccess: () => {
      message.success(t('admin_deploy.command_queued'));
      setUpdateModalOpen(false);
      setTimeout(() => instancesQuery.refetch(), 1000);
    },
    onError: (error) => {
      message.error((error as Error).message);
    },
  });

  const versionOptions = useMemo(
    () =>
      (npmQuery.data?.versions ?? []).map((entry) => ({
        value: entry.version,
        label: (
          <Space>
            <span>{entry.version}</span>
            {entry.version === latestVersion && <Tag color="green">latest</Tag>}
            {nodeVersion && entry.version === nodeVersion && (
              <Tag>{t('admin_deploy.current_tag')}</Tag>
            )}
            <Text type="secondary" className="text-xs">
              {formatDateTime(entry.publishedAt)}
            </Text>
          </Space>
        ),
      })),
    [npmQuery.data, latestVersion, nodeVersion, t],
  );

  const openUpdateModal = () => {
    setSelectedVersion(latestVersion ?? null);
    setUpdateModalOpen(true);
  };

  const columns: ColumnsType<InstanceRow> = [
    {
      title: t('admin_deploy.col_instance'),
      key: 'instance',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <Tag color={ROLE_COLORS[row.role] ?? 'default'}>{row.role}</Tag>
            <Text strong>{row.hostname}</Text>
          </Space>
          <Text type="secondary" className="text-xs">
            pid {row.pid}
          </Text>
        </Space>
      ),
    },
    {
      title: t('admin_deploy.col_version'),
      key: 'version',
      render: (_, row) => {
        const isLatest = latestVersion && row.version === latestVersion;
        return (
          <Space direction="vertical" size={0}>
            <Tooltip title={`commit ${row.commit.slice(0, 8)}`}>
              <Tag
                color={
                  isLatest ? 'green' : latestVersion ? 'orange' : 'default'
                }
              >
                {row.version}
              </Tag>
            </Tooltip>
            {!isLatest && latestVersion && (
              <Text type="secondary" className="text-xs">
                {t('admin_deploy.latest_hint', { version: latestVersion })}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: t('admin_deploy.col_uptime'),
      key: 'uptime',
      responsive: ['md'],
      render: (_, row) => (
        <Tooltip title={formatDateTime(row.startTime)}>
          <span>{formatUptime(row.uptimeSeconds)}</span>
        </Tooltip>
      ),
    },
    {
      title: t('admin_deploy.col_resources'),
      key: 'resources',
      responsive: ['lg'],
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text className="text-xs">
            RSS {formatBytes(row.memory.rss)} · Heap{' '}
            {formatBytes(row.memory.heapUsed)}/
            {formatBytes(row.memory.heapTotal)}
          </Text>
          <Text className="text-xs">
            CPU: {row.cpuPercent === null ? '-' : `${row.cpuPercent}%`} · load{' '}
            {row.system.loadavg?.[0] ?? '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: t('admin_deploy.col_current_task'),
      key: 'task',
      responsive: ['md'],
      render: (_, row) => {
        const worker = row.extra?.worker;
        if (!worker) {
          return '-';
        }
        const { currentTask, counters } = worker;
        return (
          <Space direction="vertical" size={0}>
            {currentTask ? (
              <Tooltip
                title={`${currentTask.fromHash} → ${currentTask.toHash}`}
              >
                <Tag color="processing" icon={<SyncOutlined spin />}>
                  #{currentTask.id} {currentTask.type}
                </Tag>
              </Tooltip>
            ) : (
              <Text type="secondary">{t('admin_deploy.idle')}</Text>
            )}
            <Text type="secondary" className="text-xs">
              {t('admin_deploy.task_counters', {
                processed: counters.processed,
                retry: counters.retry,
                failed: counters.failed,
              })}
            </Text>
          </Space>
        );
      },
    },
    {
      title: t('admin_deploy.col_deploy_status'),
      key: 'deployStatus',
      render: (_, row) => {
        const status = row.deployStatus;
        if (!status) {
          return '-';
        }
        return (
          <Tooltip
            title={
              <>
                <div>
                  {status.action}
                  {status.version ? ` → ${status.version}` : ''}
                </div>
                {status.message && <div>{status.message}</div>}
                <div>{formatDateTime(status.updatedAt)}</div>
              </>
            }
          >
            <Tag color={DEPLOY_STATUS_COLORS[status.status]}>
              {t(`admin_deploy.status_${status.status}`)}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: t('admin_deploy.col_action'),
      key: 'action',
      render: (_, row) => (
        <Popconfirm
          title={t('admin_deploy.restart_confirm', { id: row.id })}
          onConfirm={() => restartMutation.mutate(row.id)}
        >
          <Button
            size="small"
            icon={<ReloadOutlined />}
            disabled={restartMutation.isPending}
          >
            {t('admin_deploy.restart')}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      className="mb-4"
      title={t('admin_deploy.title')}
      extra={
        <Space size="middle" wrap>
          <span>
            <Text type="secondary">{t('admin_deploy.npm_latest')}: </Text>
            {latestVersion ? <Tag color="green">{latestVersion}</Tag> : '-'}
          </span>
          <Button
            size="small"
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={openUpdateModal}
            disabled={updateMutation.isPending || rows.length === 0}
          >
            {t('admin_deploy.update')}
          </Button>
        </Space>
      }
    >
      {npmQuery.isError && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          message={t('admin_deploy.npm_unavailable')}
        />
      )}
      {instancesQuery.isError && (
        <Alert
          className="mb-2"
          type="error"
          showIcon
          message={t('admin_deploy.instances_unavailable')}
        />
      )}
      <Table
        dataSource={rows}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 900 }}
        locale={{ emptyText: t('admin_deploy.no_instances') }}
      />

      <Modal
        title={t('admin_deploy.update_modal_title', { node: target.label })}
        open={updateModalOpen}
        onCancel={() => setUpdateModalOpen(false)}
        okText={t('admin_deploy.update_confirm')}
        okButtonProps={{
          disabled: !selectedVersion,
          loading: updateMutation.isPending,
        }}
        onOk={() => {
          if (selectedVersion) {
            updateMutation.mutate(selectedVersion);
          }
        }}
      >
        <Space direction="vertical" className="w-full">
          <Text type="secondary">
            {t('admin_deploy.current_version')}:{' '}
            <Text code>{nodeVersion ?? '-'}</Text>
          </Text>
          <Select
            className="w-full"
            placeholder={t('admin_deploy.select_version')}
            value={selectedVersion}
            onChange={setSelectedVersion}
            options={versionOptions}
            showSearch
            optionFilterProp="value"
          />
          <Alert type="info" showIcon message={t('admin_deploy.update_hint')} />
        </Space>
      </Modal>
    </Card>
  );
}
