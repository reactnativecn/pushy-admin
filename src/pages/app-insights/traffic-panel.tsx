import { Card, Radio, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AsyncColumn } from '@/components/lazy-chart';
import { useThemeMode } from '@/utils/theme-mode';
import { beijingToday, HOURLY_DAYS, summarizeTraffic } from './logic';
import { ObservationNotice } from './observation-ui';
import { RealtimeSeriesPanel } from './realtime-series-panel';
import { EmptyState, InsightsError, Question, useAppTraffic } from './shared';

/** 实时请求与小时分布；两者都有自己的时间范围，不跟随页面顶部的天数。 */
export const TrafficPanel = ({
  appKey,
  isAdmin,
}: {
  appKey: string | undefined;
  isAdmin: boolean;
}) => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const traffic = useAppTraffic(appKey, HOURLY_DAYS);
  const summary = useMemo(
    () => summarizeTraffic(traffic.data?.days, traffic.data?.window?.today),
    [traffic.data],
  );
  const [hourlyDate, setHourlyDate] = useState<string | null>(null);
  const hourlyDay =
    summary.hourlyDays.find((item) => item.date === hourlyDate) ??
    summary.hourlyDays.at(-1);
  const hourlyData = (hourlyDay?.hourly ?? []).map((value, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    value,
  }));
  const today = traffic.data?.window?.today ?? beijingToday();
  return (
    <div className="space-y-4">
      <RealtimeSeriesPanel appKey={appKey} isAdmin={isAdmin} />
      {!!traffic.error && <InsightsError error={traffic.error} />}
      <ObservationNotice
        window={traffic.data?.window}
        updatedAt={traffic.dataUpdatedAt}
        stale={!!traffic.error && !!traffic.data}
      />
      <Card
        size="small"
        title={t('app_insights.hourly_title')}
        extra={
          summary.hourlyDays.length > 1 && (
            <Radio.Group
              size="small"
              value={hourlyDay?.date}
              onChange={(event) => setHourlyDate(event.target.value)}
            >
              {summary.hourlyDays.map((item) => (
                <Radio.Button key={item.date} value={item.date}>
                  {item.date === today
                    ? t('app_insights.today')
                    : item.date.slice(5)}
                </Radio.Button>
              ))}
            </Radio.Group>
          )
        }
      >
        <Question>{t('app_insights.hourly_question')}</Question>
        <Spin spinning={traffic.isLoading}>
          {hourlyData.some((point) => point.value > 0) ? (
            <AsyncColumn
              theme={isDark ? 'classicDark' : 'classic'}
              data={hourlyData}
              xField="hour"
              yField="value"
              height={260}
              axis={{ x: { title: false }, y: { title: false } }}
            />
          ) : (
            <EmptyState>
              {traffic.isLoading ? '' : t('app_insights.no_observations')}
            </EmptyState>
          )}
        </Spin>
      </Card>
    </div>
  );
};
