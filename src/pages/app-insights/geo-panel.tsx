import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Spin } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { formatCount, formatInteger } from '@/utils/format';
import { metricsKeys } from '@/utils/query-keys';
import { formatRegion } from '@/utils/region';
import {
  GEO_FETCH_DAYS,
  GEO_TOP_LIMIT,
  summarizeGeo,
  UNKNOWN_REGION,
} from './geo.logic';
import { BarList, EmptyState, StatTile } from './shared';

// 地区分布只有天粒度（服务端按北京时间自然日累加），天数跟随页面顶部的选择。

export const GeoPanel = ({
  appKey,
  days,
  isAdmin,
}: {
  appKey: string | undefined;
  days: number;
  isAdmin: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  const { data, isLoading } = useQuery({
    queryKey: metricsKeys.appGeo(appKey, GEO_FETCH_DAYS),
    queryFn: () => api.getAppGeo({ appKey: appKey!, days: GEO_FETCH_DAYS }),
    enabled: !!appKey,
    // 今日数据服务端每秒刷新，页面停留时定期跟上即可
    refetchInterval: 60_000,
  });

  const summary = useMemo(
    () =>
      summarizeGeo(data?.days, days, (region) =>
        formatRegion(region, language),
      ),
    [data, days, language],
  );
  const items = summary.regions.map((item) => {
    const label =
      item.region === UNKNOWN_REGION
        ? t('realtime_metrics.geo_unknown')
        : item.region;
    return {
      key: item.region,
      label,
      title: label,
      count: item.count,
      percent: item.percent,
      muted: item.region === UNKNOWN_REGION,
    };
  });
  // 文案里自带 %，这里只给数字
  const unknownPercent =
    summary.total > 0 ? (summary.unknown / summary.total) * 100 : 0;

  return (
    <Card
      title={
        <span className="flex flex-wrap items-baseline gap-x-2">
          {t('realtime_metrics.geo_title')}
          <span className="text-xs font-normal text-gray-500">
            {t('realtime_metrics.geo_hint')}
          </span>
        </span>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {!appKey ? (
        <EmptyState height="h-20">
          {t('realtime_metrics.please_select_app')}
        </EmptyState>
      ) : (
        <Spin spinning={isLoading}>
          {isAdmin && data && !data.regionResolver && (
            <Alert
              type="warning"
              showIcon
              className="mb-3"
              message={t('realtime_metrics.geo_resolver_missing')}
            />
          )}
          <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              <StatTile
                label={t('realtime_metrics.geo_total')}
                value={formatCount(isLoading ? null : summary.total)}
                hint={t('app_insights.days_option', { days })}
              />
              <StatTile
                label={t('realtime_metrics.geo_region_count')}
                value={formatInteger(isLoading ? null : summary.regions.length)}
                hint={t('realtime_metrics.geo_unknown_share', {
                  percent: unknownPercent.toFixed(1),
                })}
              />
            </div>
            {items.length > 0 ? (
              <div className="min-w-0">
                <BarList
                  items={items}
                  limit={GEO_TOP_LIMIT}
                  restLabel={(count) =>
                    t('realtime_metrics.geo_other', { count })
                  }
                />
              </div>
            ) : (
              <EmptyState height="h-20">
                {isLoading ? '' : t('realtime_metrics.geo_no_data')}
              </EmptyState>
            )}
          </div>
        </Spin>
      )}
    </Card>
  );
};
