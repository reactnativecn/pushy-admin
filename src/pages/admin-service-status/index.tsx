import { useQueries } from '@tanstack/react-query';
import { Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { metricsKeys } from '@/utils/query-keys';
import {
  buildServiceStatusSummary,
  SERVICE_STATUS_TARGETS,
  type ServiceStatusTargetKey,
} from './metrics';
import { ServiceStatusPanel } from './status-panel';
import { ServiceTargetSidebar } from './target-sidebar';

const { Text, Title } = Typography;

export const Component = () => {
  const [activeTargetKey, setActiveTargetKey] =
    useState<ServiceStatusTargetKey>(SERVICE_STATUS_TARGETS[0].key);
  const { t } = useTranslation();
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
  const activeTargetIndex = Math.max(
    SERVICE_STATUS_TARGETS.findIndex(
      (target) => target.key === activeTargetKey,
    ),
    0,
  );
  const activeTarget = SERVICE_STATUS_TARGETS[activeTargetIndex];
  const activeQuery = targetQueries[activeTargetIndex];
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
      <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ServiceTargetSidebar
          activeKey={activeTarget.key}
          items={targetItems}
          onChange={setActiveTargetKey}
        />
        <div className="min-w-0">
          <ServiceStatusPanel
            error={activeQuery?.error}
            isFetching={activeQuery?.isFetching ?? false}
            key={activeTarget.key}
            refetch={() => activeQuery?.refetch()}
            snapshot={activeQuery?.data}
            target={activeTarget}
          />
        </div>
      </div>
    </div>
  );
};
