import { useQuery } from '@tanstack/react-query';
import type { TableColumnsType } from 'antd';
import {
  Alert,
  Card,
  Collapse,
  Descriptions,
  Drawer,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type ClientErrorIssueSummary } from '@/services/api';
import { clientErrorKeys } from '@/utils/query-keys';

const { Paragraph, Text } = Typography;
const PAGE_SIZE = 20;

type FatalFilter = 'all' | 'fatal' | 'handled';

export function VersionHealthErrors({
  appId,
  start,
  end,
}: {
  appId?: number;
  start: string;
  end: string;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [fatalFilter, setFatalFilter] = useState<FatalFilter>('all');
  const [selectedIssueId, setSelectedIssueId] = useState<number>();
  const fatal = fatalFilter === 'all' ? undefined : fatalFilter === 'fatal';
  const offset = (page - 1) * PAGE_SIZE;

  const listQuery = useQuery({
    queryKey: clientErrorKeys.list(appId, start, end, offset, PAGE_SIZE, fatal),
    queryFn: () =>
      api.getClientErrors({
        appId: appId!,
        start,
        end,
        offset,
        limit: PAGE_SIZE,
        fatal,
      }),
    enabled: appId !== undefined,
  });

  const detailQuery = useQuery({
    queryKey: clientErrorKeys.detail(appId, selectedIssueId),
    queryFn: () => api.getClientError(appId!, selectedIssueId!),
    enabled: appId !== undefined && selectedIssueId !== undefined,
  });

  // 符号化在服务端完成（归档的 sourcemap 在无 CORS 的 CDN 上，浏览器拿不到，
  // 页面也只需要渲染结果）；这里只取回展示内容。失败不重试：常见失败是
  // 版本没归档 map（404）或存储暂不可用（502），重试不会变好。
  const symbolicationQuery = useQuery({
    queryKey: clientErrorKeys.symbolicated(appId, selectedIssueId),
    queryFn: () => api.getSymbolicatedError(appId!, selectedIssueId!),
    enabled:
      appId !== undefined &&
      selectedIssueId !== undefined &&
      detailQuery.data?.sourceMapAvailable === true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const symbolicated = symbolicationQuery.data;

  const columns = useMemo<TableColumnsType<ClientErrorIssueSummary>>(
    () => [
      {
        title: t('version_health.error_column_error'),
        key: 'error',
        render: (_, row) => (
          <div className="min-w-64">
            <div className="font-medium">{row.errorName}</div>
            <Paragraph ellipsis={{ rows: 2 }} className="!mb-0 text-xs">
              {row.message}
            </Paragraph>
          </div>
        ),
      },
      {
        title: t('version_health.column_version'),
        key: 'version',
        width: 150,
        render: (_, row) => (
          <div>
            <div>{row.versionName || row.hash}</div>
            <Text type="secondary" className="text-xs">
              {row.packageVersion || '-'}
            </Text>
          </div>
        ),
      },
      {
        title: t('version_health.error_column_level'),
        dataIndex: 'fatal',
        width: 100,
        render: (isFatal: boolean) =>
          isFatal ? (
            <Tag color="error">{t('version_health.error_fatal')}</Tag>
          ) : (
            <Tag>{t('version_health.error_handled')}</Tag>
          ),
      },
      {
        title: t('version_health.error_column_count'),
        dataIndex: 'occurrenceCount',
        align: 'right',
        width: 90,
      },
      {
        title: t('version_health.error_column_last_seen'),
        dataIndex: 'lastSeenAt',
        width: 160,
        render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
      },
    ],
    [t],
  );

  const detail = detailQuery.data;
  const displayedStack = symbolicated?.stack ?? detail?.rawStack;

  return (
    <>
      <Card
        title={t('version_health.error_title')}
        size="small"
        style={{ marginTop: 16 }}
        extra={
          <Select<FatalFilter>
            size="small"
            value={fatalFilter}
            onChange={(value) => {
              setFatalFilter(value);
              setPage(1);
              setSelectedIssueId(undefined);
            }}
            options={[
              { value: 'all', label: t('version_health.error_filter_all') },
              { value: 'fatal', label: t('version_health.error_fatal') },
              { value: 'handled', label: t('version_health.error_handled') },
            ]}
          />
        }
      >
        <Table<ClientErrorIssueSummary>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={listQuery.data?.data ?? []}
          loading={listQuery.isLoading}
          locale={{ emptyText: t('version_health.error_no_data') }}
          scroll={{ x: 760 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: listQuery.data?.count ?? 0,
            showSizeChanger: false,
            showTotal: (total) =>
              t('version_health.error_total', { count: total }),
            onChange: setPage,
          }}
          onRow={(row) => ({
            className: 'cursor-pointer',
            onClick: () => setSelectedIssueId(row.id),
          })}
        />
      </Card>

      <Drawer
        title={t('version_health.error_detail_title')}
        width={760}
        open={selectedIssueId !== undefined}
        loading={detailQuery.isLoading}
        onClose={() => setSelectedIssueId(undefined)}
      >
        {detail && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  key: 'message',
                  label: t('version_health.error_message'),
                  children: (
                    <Text>{`${detail.errorName}: ${detail.message}`}</Text>
                  ),
                },
                {
                  key: 'version',
                  label: t('version_health.column_version'),
                  children: `${detail.versionName || '-'} (${detail.hash})`,
                },
                {
                  key: 'environment',
                  label: t('version_health.error_environment'),
                  children: [
                    detail.packageVersion && `App ${detail.packageVersion}`,
                    detail.rnu && `RNU ${detail.rnu}`,
                    detail.rn && `RN ${detail.rn}`,
                    detail.os,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                },
                {
                  key: 'time',
                  label: t('version_health.error_seen'),
                  children: `${dayjs(detail.firstSeenAt).format('YYYY-MM-DD HH:mm:ss')} – ${dayjs(detail.lastSeenAt).format('YYYY-MM-DD HH:mm:ss')} · ${t('version_health.error_total', { count: detail.occurrenceCount })}`,
                },
                {
                  key: 'fingerprint',
                  label: 'Fingerprint',
                  children: (
                    <Paragraph copyable className="!mb-0 font-mono text-xs">
                      {detail.fingerprint}
                    </Paragraph>
                  ),
                },
              ]}
            />

            {symbolicationQuery.isLoading && detail.sourceMapAvailable && (
              <Alert
                type="info"
                showIcon
                message={t('version_health.error_symbolicating')}
              />
            )}
            {!detail.sourceMapAvailable && (
              <Alert
                type="warning"
                showIcon
                message={t('version_health.error_no_source_map')}
              />
            )}
            {symbolicationQuery.isError && (
              <Alert
                type="warning"
                showIcon
                message={t('version_health.error_symbolication_failed')}
                description={
                  symbolicationQuery.error instanceof Error
                    ? symbolicationQuery.error.message
                    : undefined
                }
              />
            )}
            {symbolicated && (
              <Alert
                type={symbolicated.mappedFrames > 0 ? 'success' : 'warning'}
                showIcon
                message={t('version_health.error_symbolicated', {
                  mapped: symbolicated.mappedFrames,
                  total: symbolicated.totalFrames,
                })}
              />
            )}

            <section>
              <div className="mb-2 font-medium">
                {t('version_health.error_stack')}
              </div>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-3 text-xs dark:bg-gray-900">
                {displayedStack || '-'}
              </pre>
            </section>

            {symbolicated && symbolicated.stack !== detail.rawStack && (
              <Collapse
                size="small"
                items={[
                  {
                    key: 'raw-stack',
                    label: t('version_health.error_raw_stack'),
                    children: (
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs">
                        {detail.rawStack}
                      </pre>
                    ),
                  },
                ]}
              />
            )}

            {symbolicated?.firstSnippet && (
              <section>
                <div className="mb-2 font-medium">
                  {t('version_health.error_source_context')}
                </div>
                <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-gray-900">
                  {symbolicated.firstSnippet.lines
                    .map(
                      (line) =>
                        `${line.number === symbolicated.firstSnippet?.line ? '>' : ' '} ${String(line.number).padStart(4)} | ${line.text}`,
                    )
                    .join('\n')}
                </pre>
              </section>
            )}

            {detail.componentStack && (
              <section>
                <div className="mb-2 font-medium">
                  {t('version_health.error_component_stack')}
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-3 text-xs dark:bg-gray-900">
                  {detail.componentStack}
                </pre>
              </section>
            )}

            {detail.context && Object.keys(detail.context).length > 0 && (
              <section>
                <div className="mb-2 font-medium">
                  {t('version_health.error_context')}
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-3 text-xs dark:bg-gray-900">
                  {JSON.stringify(detail.context, null, 2)}
                </pre>
              </section>
            )}
          </Space>
        )}
      </Drawer>
    </>
  );
}
