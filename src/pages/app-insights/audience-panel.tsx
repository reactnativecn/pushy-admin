import { Card, Segmented, Spin } from 'antd';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RealtimeGeoPanel } from '../realtime-metrics-geo';
import { type RankedItem, summarizeTraffic } from './logic';
import { ObservationNotice } from './observation-ui';
import {
  BarList,
  type BarListItem,
  EmptyState,
  InsightsError,
  Question,
  useAppTraffic,
  useCarrierLabel,
} from './shared';

const PLATFORM_LABEL: Record<string, string> = {
  android: 'Android',
  ios: 'iOS',
  harmony: 'HarmonyOS',
  harmonyos: 'HarmonyOS',
};

/** "android 14" → "Android 14"；无法识别的保持原样。 */
const formatOS = (label: string) => {
  const [platform = '', ...rest] = label.split(' ');
  return [PLATFORM_LABEL[platform] ?? platform, ...rest].join(' ');
};

/** 平台（可切到系统版本细分），以及网络与地区；都跟随页面顶部的天数。 */
export const AudiencePanel = ({
  appKey,
  days,
  isAdmin,
}: {
  appKey: string | undefined;
  days: number;
  isAdmin: boolean;
}) => {
  const { t } = useTranslation();
  const carrierLabel = useCarrierLabel();
  const traffic = useAppTraffic(appKey, days);
  const summary = useMemo(
    () => summarizeTraffic(traffic.data?.days, traffic.data?.window?.today),
    [traffic.data],
  );
  const unknown = t('app_insights.ip_unknown');
  const labelled = (items: RankedItem[], labelOf: (key: string) => string) =>
    items.map((row) => ({
      ...row,
      label: row.key === 'unknown' ? unknown : labelOf(row.key),
      muted: row.key === 'unknown',
    }));
  const [platformDetail, setPlatformDetail] = useState(false);
  const cards: Array<{
    key: string;
    title: string;
    question: string;
    items: BarListItem[];
    extra?: ReactNode;
    emptyText?: string;
  }> = [
    {
      key: 'platforms',
      title: t('app_insights.platforms_title'),
      question: t('app_insights.platforms_question'),
      items: labelled(
        platformDetail ? summary.osVersions : summary.platforms,
        formatOS,
      ),
      extra: (
        <Segmented
          size="small"
          value={platformDetail ? 'detail' : 'overall'}
          onChange={(value) => setPlatformDetail(value === 'detail')}
          options={[
            { value: 'overall', label: t('app_insights.platform_overall') },
            { value: 'detail', label: t('app_insights.platform_detail') },
          ]}
        />
      ),
      emptyText:
        traffic.data && !summary.hasClientInfo
          ? t('app_insights.client_info_unavailable')
          : undefined,
    },
    {
      key: 'carriers',
      title: t('app_insights.carriers_title'),
      question: t('app_insights.carriers_question'),
      items: summary.carriers.map((row) => ({
        ...row,
        label: carrierLabel(row.key),
      })),
    },
    {
      key: 'ip',
      title: t('app_insights.ip_title'),
      question: t('app_insights.ip_question'),
      items: summary.ipVersion.map((row) => ({
        ...row,
        label: row.key === 'v4' ? 'IPv4' : row.key === 'v6' ? 'IPv6' : unknown,
      })),
    },
  ];
  return (
    <div className="space-y-4">
      {!!traffic.error && <InsightsError error={traffic.error} />}
      <ObservationNotice
        window={traffic.data?.window}
        updatedAt={traffic.dataUpdatedAt}
        stale={!!traffic.error && !!traffic.data}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {cards.map((card) => (
          <Card
            size="small"
            title={card.title}
            extra={card.extra}
            key={card.key}
          >
            <Question>{card.question}</Question>
            <Spin spinning={traffic.isLoading}>
              {card.items.length > 0 ? (
                <BarList items={card.items} />
              ) : (
                <EmptyState>
                  {traffic.isLoading
                    ? ''
                    : (card.emptyText ?? t('app_insights.no_observations'))}
                </EmptyState>
              )}
            </Spin>
          </Card>
        ))}
      </div>
      <RealtimeGeoPanel appKey={appKey} days={days} isAdmin={isAdmin} />
    </div>
  );
};
