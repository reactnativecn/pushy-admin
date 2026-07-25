import { useQueries } from '@tanstack/react-query';
import { Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { metricsKeys } from '@/utils/query-keys';
import {
  buildServiceStatusSummary,
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
  // 概览指标始终为所有节点轮询——卡片要靠它显示健康状态
  const targetQueries = useQueries({
    queries: SERVICE_STATUS_TARGETS.map((target) => ({
      queryFn: () =>
        api.getInternalMetrics({
          baseUrl: target.baseUrl,
          suppressErrorToast: true,
        }),
      queryKey: metricsKeys.internal(target.key),
      refetchInterval: 30_000,
    })),
  });
  const openTargetIndex = SERVICE_STATUS_TARGETS.findIndex(
    (target) => target.key === openTargetKey,
  );
  const openTarget =
    openTargetIndex >= 0 ? SERVICE_STATUS_TARGETS[openTargetIndex] : null;
  const openQuery =
    openTargetIndex >= 0 ? targetQueries[openTargetIndex] : null;
  const targetItems = SERVICE_STATUS_TARGETS.map((target, index) => {
    const query = targetQueries[index];
    return {
      hasData: Boolean(query?.data),
      isError: Boolean(query?.error),
      isFetching: query?.isFetching ?? false,
      summary: buildServiceStatusSummary(query?.data),
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
            error={openQuery?.error}
            isFetching={openQuery?.isFetching ?? false}
            key={openTarget.key}
            refetch={() => openQuery?.refetch()}
            snapshot={openQuery?.data}
            target={openTarget}
          />
        )}
      </Modal>
    </div>
  );
};
