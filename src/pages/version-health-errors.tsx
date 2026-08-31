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
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  api,
  type ClientErrorIssueDetail,
  type ClientErrorIssueSummary,
} from '@/services/api';
import { clientErrorKeys } from '@/utils/query-keys';
import type { SymbolicationResult } from '@/utils/symbolicate-stack';
import { symbolicateInWorker } from '@/utils/symbolication-worker-client';

const { Paragraph, Text } = Typography;
const PAGE_SIZE = 20;
const MAX_SOURCE_MAP_BYTES = 128 * 1024 * 1024;

type FatalFilter = 'all' | 'fatal' | 'handled';
type SymbolicationState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; result: SymbolicationResult }
  | { status: 'error'; message: string };

async function loadAndSymbolicate(
  appId: number,
  detail: ClientErrorIssueDetail,
): Promise<SymbolicationResult> {
  const location = await api.getVersionSourceMap(appId, detail.versionId);
  if (!location.url) throw new Error('source map has no download URL');
  const response = await fetch(location.url, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`source map download failed (${response.status})`);
  }
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_SOURCE_MAP_BYTES) {
    throw new Error('source map is too large for browser symbolication');
  }
  const sourceMap = await response.text();
  if (sourceMap.length > MAX_SOURCE_MAP_BYTES) {
    throw new Error('source map is too large for browser symbolication');
  }
  return symbolicateInWorker(detail.rawStack, sourceMap);
}

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
  const [symbolication, setSymbolication] = useState<SymbolicationState>({
    status: 'idle',
  });
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

  useEffect(() => {
    const detail = detailQuery.data;
    if (!appId || !detail?.sourceMapAvailable) {
      setSymbolication({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setSymbolication({ status: 'loading' });
    loadAndSymbolicate(appId, detail)
      .then((result) => {
        if (!cancelled) setSymbolication({ status: 'success', result });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSymbolication({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [appId, detailQuery.data]);

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
  const displayedStack =
    symbolication.status === 'success'
      ? symbolication.result.stack
      : detail?.rawStack;

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

            {symbolication.status === 'loading' && (
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
            {symbolication.status === 'error' && (
              <Alert
                type="warning"
                showIcon
                message={t('version_health.error_symbolication_failed')}
                description={symbolication.message}
              />
            )}
            {symbolication.status === 'success' && (
              <Alert
                type={
                  symbolication.result.mappedFrames > 0 ? 'success' : 'warning'
                }
                showIcon
                message={t('version_health.error_symbolicated', {
                  mapped: symbolication.result.mappedFrames,
                  total: symbolication.result.totalFrames,
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

            {symbolication.status === 'success' &&
              symbolication.result.stack !== detail.rawStack && (
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

            {symbolication.status === 'success' &&
              symbolication.result.firstSnippet && (
                <section>
                  <div className="mb-2 font-medium">
                    {t('version_health.error_source_context')}
                  </div>
                  <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-gray-900">
                    {symbolication.result.firstSnippet.lines
                      .map(
                        (line) =>
                          `${line.number === symbolication.result.firstSnippet?.line ? '>' : ' '} ${String(line.number).padStart(4)} | ${line.text}`,
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
