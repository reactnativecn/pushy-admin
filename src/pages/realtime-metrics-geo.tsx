import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Radio, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { metricsKeys } from '@/utils/query-keys';
import {
  GEO_FETCH_DAYS,
  GEO_WINDOWS,
  type GeoWindow,
  summarizeGeo,
  UNKNOWN_REGION,
} from './realtime-metrics-geo.logic';

// 地区分布只有天粒度（服务端按北京时间自然日累加），和上面的 5 分钟曲线
// 不共用时间范围：今日那一条是实时累计，其余按天回看。

const WINDOW_LABEL_KEY: Record<GeoWindow, string> = {
  today: 'realtime_metrics.geo_today',
  '7d': 'realtime_metrics.geo_7d',
  '30d': 'realtime_metrics.geo_30d',
};

export const RealtimeGeoPanel = ({
  appKey,
  isAdmin,
}: {
  appKey: string | undefined;
  isAdmin: boolean;
}) => {
  const { t } = useTranslation();
  const [geoWindow, setGeoWindow] = useState<GeoWindow>('today');

  const { data, isLoading } = useQuery({
    queryKey: metricsKeys.appGeo(appKey, GEO_FETCH_DAYS),
    queryFn: () => api.getAppGeo({ appKey: appKey!, days: GEO_FETCH_DAYS }),
    enabled: !!appKey,
    // 今日数据服务端每秒刷新，页面停留时定期跟上即可
    refetchInterval: 60_000,
  });

  const summary = useMemo(
    () => summarizeGeo(data?.days, geoWindow),
    [data, geoWindow],
  );
  const topMax = summary.top[0]?.count ?? 0;
  const regionLabel = (region: string) =>
    region === UNKNOWN_REGION ? t('realtime_metrics.geo_unknown') : region;

  return (
    <Card
      title={t('realtime_metrics.geo_title')}
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Radio.Group
          size="small"
          value={geoWindow}
          onChange={(e) => setGeoWindow(e.target.value as GeoWindow)}
          optionType="button"
          buttonStyle="solid"
        >
          {GEO_WINDOWS.map((value) => (
            <Radio.Button key={value} value={value}>
              {t(WINDOW_LABEL_KEY[value])}
            </Radio.Button>
          ))}
        </Radio.Group>
      }
    >
      {!appKey ? (
        <div className="h-20 flex items-center justify-center text-gray-400">
          {t('realtime_metrics.please_select_app')}
        </div>
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
              <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-500">
                  {t('realtime_metrics.geo_total')}
                </div>
                <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                  {isLoading ? '-' : summary.total.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {t(WINDOW_LABEL_KEY[geoWindow])}
                </div>
              </div>
              <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-500">
                  {t('realtime_metrics.geo_region_count')}
                </div>
                <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                  {isLoading ? '-' : summary.regionCount}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {t('realtime_metrics.geo_unknown_share', {
                    percent:
                      summary.total > 0
                        ? ((summary.unknown / summary.total) * 100).toFixed(1)
                        : '0.0',
                  })}
                </div>
              </div>
            </div>

            {summary.top.length > 0 ? (
              <div className="min-w-0">
                <ul className="m-0 list-none p-0">
                  {summary.top.map((item, index) => (
                    <li
                      key={item.region}
                      className="grid grid-cols-[2rem_minmax(0,7rem)_minmax(0,1fr)_5rem_4rem] items-center gap-2 py-1 text-sm"
                    >
                      <span className="text-xs text-gray-400 tabular-nums">
                        {index + 1}
                      </span>
                      <span
                        className="truncate"
                        title={regionLabel(item.region)}
                      >
                        {regionLabel(item.region)}
                      </span>
                      <span className="h-2 overflow-hidden rounded bg-gray-100">
                        <span
                          className={`block h-full rounded ${
                            item.region === UNKNOWN_REGION
                              ? 'bg-gray-300'
                              : 'bg-primary'
                          }`}
                          style={{
                            width: `${
                              topMax > 0
                                ? Math.max((item.count / topMax) * 100, 2)
                                : 0
                            }%`,
                          }}
                        />
                      </span>
                      <span className="text-right tabular-nums">
                        {item.count.toLocaleString()}
                      </span>
                      <span className="text-right text-xs text-gray-500 tabular-nums">
                        {item.percent.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                  {summary.rest && (
                    <li className="grid grid-cols-[2rem_minmax(0,7rem)_minmax(0,1fr)_5rem_4rem] items-center gap-2 py-1 text-sm text-gray-500">
                      <span />
                      <span className="truncate">
                        {t('realtime_metrics.geo_other', {
                          count: summary.rest.regions,
                        })}
                      </span>
                      <span />
                      <span className="text-right tabular-nums">
                        {summary.rest.count.toLocaleString()}
                      </span>
                      <span className="text-right text-xs tabular-nums">
                        {summary.rest.percent.toFixed(1)}%
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-400">
                {isLoading ? '' : t('realtime_metrics.geo_no_data')}
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {t('realtime_metrics.geo_hint', {
              days: data?.retentionDays ?? GEO_FETCH_DAYS,
            })}
          </div>
        </Spin>
      )}
    </Card>
  );
};
