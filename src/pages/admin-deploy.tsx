import {
  CloudUploadOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Grid,
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
import {
  formatBytes,
  formatUptime,
  SERVICE_STATUS_TARGETS,
} from './admin-service-status/metrics';

const { Text, Title } = Typography;

interface InstanceRow extends SystemInstance {
  targetKey: string;
  baseUrl: string;
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

export const Component = () => {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [updateTarget, setUpdateTarget] = useState<InstanceRow | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const npmQuery = useQuery({
    queryKey: adminKeys.systemNpm(),
    queryFn: () => adminApi.getSystemNpmInfo(),
    refetchInterval: 60_000,
  });

  const instanceQueries = useQueries({
    queries: SERVICE_STATUS_TARGETS.map((target) => ({
      queryKey: adminKeys.systemInstances(target.key),
      queryFn: () => adminApi.getSystemInstances(target.baseUrl),
      refetchInterval: 10_000,
    })),
  });

  const isFetching = instanceQueries.some((query) => query.isFetching);
  const allFailed =
    instanceQueries.length > 0 &&
    instanceQueries.every((query) => query.isError);

  // Nodes sharing one Redis report the same instances — dedupe by instance id
  // and remember which node answered so commands are routed to a node that can
  // reach that instance's Redis.
  const rows = useMemo(() => {
    const byId = new Map<string, InstanceRow>();
    instanceQueries.forEach((query, index) => {
      const target = SERVICE_STATUS_TARGETS[index];
      if (!query.data) {
        return;
      }
      const deployStatuses = query.data.deployStatuses ?? {};
      for (const instance of query.data.data ?? []) {
        if (!byId.has(instance.id)) {
          byId.set(instance.id, {
            ...instance,
            targetKey: target.key,
            baseUrl: target.baseUrl,
            deployStatus: deployStatuses[instance.id],
          });
        }
      }
    });
    return [...byId.values()].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }, [instanceQueries]);

  const latestVersion = npmQuery.data?.distTags?.latest;

  const refetchAll = () => {
    npmQuery.refetch();
    for (const query of instanceQueries) {
      query.refetch();
    }
  };

  const commandMutation = useMutation({
    mutationFn: (params: {
      instanceId: string;
      action: 'restart' | 'update';
      version?: string;
      baseUrl: string;
    }) => adminApi.sendInstanceCommand(params),
    onSuccess: () => {
      message.success(t('admin_deploy.command_queued'));
      setUpdateTarget(null);
      setTimeout(refetchAll, 1000);
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
            <Text type="secondary" className="text-xs">
              {formatDateTime(entry.publishedAt)}
            </Text>
          </Space>
        ),
      })),
    [npmQuery.data, latestVersion],
  );

  const openUpdateModal = (row: InstanceRow) => {
    setUpdateTarget(row);
    setSelectedVersion(latestVersion ?? null);
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
            pid {row.pid} · {row.targetKey}
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
      responsive: ['md'],
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text className="text-xs">
            {t('admin_deploy.memory')}: {formatBytes(row.memory.rss)}
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
      responsive: ['lg'],
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
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={() => openUpdateModal(row)}
            disabled={commandMutation.isPending}
          >
            {t('admin_deploy.update')}
          </Button>
          <Popconfirm
            title={t('admin_deploy.restart_confirm', { id: row.id })}
            onConfirm={() =>
              commandMutation.mutate({
                instanceId: row.id,
                action: 'restart',
                baseUrl: row.baseUrl,
              })
            }
          >
            <Button
              size="small"
              icon={<ReloadOutlined />}
              disabled={commandMutation.isPending}
            >
              {t('admin_deploy.restart')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-section">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={4} className="m-0!">
            {t('admin_deploy.title')}
          </Title>
          <Text type="secondary">{t('admin_deploy.description')}</Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={isFetching}
          onClick={refetchAll}
        >
          {t('admin_deploy.refresh')}
        </Button>
      </div>

      <Card className="mb-4" size="small">
        <Space size="large" wrap>
          <span>
            <Text type="secondary">{t('admin_deploy.npm_package')}: </Text>
            <Text strong>{npmQuery.data?.name ?? '-'}</Text>
          </span>
          <span>
            <Text type="secondary">{t('admin_deploy.npm_latest')}: </Text>
            {latestVersion ? <Tag color="green">{latestVersion}</Tag> : '-'}
          </span>
          <span>
            <Text type="secondary">{t('admin_deploy.npm_fetched_at')}: </Text>
            <Text>{formatDateTime(npmQuery.data?.fetchedAt)}</Text>
          </span>
        </Space>
        {npmQuery.isError && (
          <Alert
            className="mt-2"
            type="warning"
            showIcon
            message={t('admin_deploy.npm_unavailable')}
          />
        )}
      </Card>

      {allFailed && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          message={t('admin_deploy.instances_unavailable')}
        />
      )}

      <Card>
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="id"
          loading={rows.length === 0 && isFetching}
          size={isMobile ? 'small' : 'middle'}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={
          updateTarget
            ? t('admin_deploy.update_modal_title', { id: updateTarget.id })
            : ''
        }
        open={!!updateTarget}
        onCancel={() => setUpdateTarget(null)}
        okText={t('admin_deploy.update_confirm')}
        okButtonProps={{
          disabled: !selectedVersion,
          loading: commandMutation.isPending,
        }}
        onOk={() => {
          if (updateTarget && selectedVersion) {
            commandMutation.mutate({
              instanceId: updateTarget.id,
              action: 'update',
              version: selectedVersion,
              baseUrl: updateTarget.baseUrl,
            });
          }
        }}
      >
        <Space direction="vertical" className="w-full">
          <Text type="secondary">
            {t('admin_deploy.current_version')}:{' '}
            <Text code>{updateTarget?.version}</Text>
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
    </div>
  );
};
