import { useQuery } from '@tanstack/react-query';
import { Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/admin-api';
import { serviceStatusKeys } from '@/utils/query-keys';
import {
  buildServiceStatusSummary,
  SERVICE_STATUS_AGGREGATOR_BASE_URL,
  SERVICE_STATUS_TARGETS,
  type ServiceStatusTargetKey,
} from './metrics';
import { QuotaAlertsPanel } from './quota-alerts-panel';
import { ServiceStatusPanel } from './status-panel';
import { ServiceTargetCards } from './target-cards';
import { UserAnalyticsPanel } from './user-analytics-panel';
import { VersionHealthOverviewPanel } from './version-health-overview-panel';
import { WorkerStatsPanel } from './worker-stats-panel';

const { Text, Title } = Typography;

export const Component = () => {
  // null = 未选中：节点面板默认不渲染（连带停掉它的轮询）
  const [openTargetKey, setOpenTargetKey] =
    useState<ServiceStatusTargetKey | null>(null);
  const { t } = useTranslation();
  // s1 收到这个请求时才用一次 MGET 读取八个节点；浏览器不再并发跨域直读。
  const snapshotsQuery = useQuery({
    queryFn: () =>
      adminApi.getNodeSnapshots(
        SERVICE_STATUS_TARGETS.map((target) => target.key),
        SERVICE_STATUS_AGGREGATOR_BASE_URL,
      ),
    queryKey: serviceStatusKeys.nodeSnapshots(),
    refetchInterval: 30_000,
  });

  const snapshots = new Map(
    snapshotsQuery.data?.data.map((entry) => [entry.nodeId, entry.snapshot]) ??
      [],
  );
  const openTargetIndex = SERVICE_STATUS_TARGETS.findIndex(
    (target) => target.key === openTargetKey,
  );
  const openTarget =
    openTargetIndex >= 0 ? SERVICE_STATUS_TARGETS[openTargetIndex] : null;
  const openSnapshot = openTarget ? snapshots.get(openTarget.key) : null;
  const targetItems = SERVICE_STATUS_TARGETS.map((target) => {
    const snapshot = snapshots.get(target.key);
    return {
      hasData: Boolean(snapshot),
      isError:
        Boolean(snapshotsQuery.error) ||
        (snapshotsQuery.data !== undefined && snapshot == null),
      isFetching: snapshotsQuery.isFetching,
      summary: buildServiceStatusSummary(snapshot?.metrics),
      target,
    };
  });

  return (
    <div className="page-section">
      <div className="mb-4">
        <Title level={4} className="m-0!">
          {t('admin_service_status.title')}
        </Title>
        <Text type="secondary">{t('admin_service_status.description')}</Text>
      </div>
      <ServiceTargetCards items={targetItems} onSelect={setOpenTargetKey} />
      <UserAnalyticsPanel />
      <VersionHealthOverviewPanel />
      <QuotaAlertsPanel />
      <WorkerStatsPanel />

      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => setOpenTargetKey(null)}
        open={openTarget != null}
        title={
          openTarget ? `${openTarget.label} · ${openTarget.host}` : undefined
        }
        width="90vw"
        styles={{ body: { maxHeight: '78vh', overflowY: 'auto' } }}
      >
        {openTarget && (
          <ServiceStatusPanel
            error={
              snapshotsQuery.error ??
              (snapshotsQuery.data && !openSnapshot
                ? new Error(t('admin_service_status.request_failed'))
                : null)
            }
            isFetching={snapshotsQuery.isFetching}
            key={openTarget.key}
            nodeSnapshot={openSnapshot ?? undefined}
            snapshot={openSnapshot?.metrics}
            target={openTarget}
          />
        )}
      </Modal>
    </div>
  );
};
