import {
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Grid,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnType } from 'antd/lib/table';
import type { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { UAParser } from 'ua-parser-js';
import type { AuditLog } from '@/types';
import { downloadCsv } from '@/utils/csv';
import dayjs from '@/utils/dayjs';
import { patchSearchParams } from '@/utils/helper';
import { useAuditLogs } from '@/utils/hooks';

const { RangePicker } = DatePicker;
const { Paragraph, Text, Title } = Typography;

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type AuditStatusFilter = 'all' | 'success' | 'client-error' | 'server-error';

const STATUS_FILTER_VALUES: AuditStatusFilter[] = [
  'all',
  'success',
  'client-error',
  'server-error',
];

function getStatusFilterOptions(t: TranslateFn) {
  return [
    { label: t('audit_logs.status_all'), value: 'all' as AuditStatusFilter },
    {
      label: t('audit_logs.status_2xx'),
      value: 'success' as AuditStatusFilter,
    },
    {
      label: t('audit_logs.status_4xx'),
      value: 'client-error' as AuditStatusFilter,
    },
    {
      label: t('audit_logs.status_5xx'),
      value: 'server-error' as AuditStatusFilter,
    },
  ];
}

export const getUA = (userAgent: string) => {
  if (userAgent.startsWith('react-native-update-cli')) {
    return <div>cli {userAgent.split('/')[1]}</div>;
  }

  const { browser, os } = UAParser(userAgent);
  return (
    <>
      <div>
        {browser.name} {browser.version}
      </div>
      <div>
        {os.name} {os.version}
      </div>
    </>
  );
};

const getApiTokenLabel = (apiTokens?: AuditLog['apiTokens']) => {
  if (!apiTokens?.tokenSuffix) {
    return undefined;
  }

  return apiTokens.name
    ? `${apiTokens.name}(****${apiTokens.tokenSuffix})`
    : `****${apiTokens.tokenSuffix}`;
};

const normalizePath = (path: string): string => {
  return path.replace(/\/\d+/g, '/{id}').replace(/\/$/, '');
};

function getActionMap(t: TranslateFn): Record<string, string> {
  return {
    'POST /user/login': t('audit_logs.action_login'),
    'POST /user/register': t('audit_logs.action_register'),
    'POST /user/activate': t('audit_logs.action_activate'),
    'POST /user/activate/sendmail': t('audit_logs.action_send_activation'),
    'POST /user/resetpwd/sendmail': t('audit_logs.action_send_reset'),
    'POST /user/resetpwd/reset': t('audit_logs.action_reset_password'),
    'POST /user/email/change-request': t(
      'audit_logs.action_request_email_change',
    ),
    'POST /user/email/confirm': t('audit_logs.action_confirm_email_change'),
    'POST /user/email/revert': t('audit_logs.action_revert_email_change'),
    'POST /user/password/change': t('audit_logs.action_change_password'),
    'POST /app/create': t('audit_logs.action_create_app'),
    'PUT /app/{id}': t('audit_logs.action_update_app'),
    'DELETE /app/{id}': t('audit_logs.action_delete_app'),
    'POST /orders': t('audit_logs.action_create_order'),
    'POST alipayCallback': t('audit_logs.action_pay'),
    'POST /upload': t('audit_logs.action_upload_file'),
    'POST /app/{id}/package/create': t('audit_logs.action_create_pkg'),
    'PUT /app/{id}/package/{id}': t('audit_logs.action_update_pkg'),
    'DELETE /app/{id}/package': t('audit_logs.action_batch_delete_pkg'),
    'DELETE /app/{id}/package/{id}': t('audit_logs.action_delete_pkg'),
    'POST /app/{id}/version/create': t('audit_logs.action_create_hotfix'),
    'PUT /app/{id}/version/{id}': t('audit_logs.action_update_hotfix'),
    'DELETE /app/{id}/version': t('audit_logs.action_batch_delete_hotfix'),
    'DELETE /app/{id}/version/{id}': t('audit_logs.action_delete_hotfix'),
    'POST /app/{id}/binding': t('audit_logs.action_binding'),
    'DELETE /app/{id}/binding/{id}': t('audit_logs.action_delete_binding'),
    'POST /api-token/create': t('audit_logs.action_create_key'),
    'DELETE /api-token/{id}': t('audit_logs.action_delete_key'),
  };
}

const getActionKey = (method: string, path: string): string =>
  `${method.toUpperCase()} ${normalizePath(path)}`;

function getActionOptions(t: TranslateFn) {
  return Object.entries(getActionMap(t))
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const getActionLabel = (
  t: TranslateFn,
  method: string,
  path: string,
): string => {
  const key = getActionKey(method, path);
  return getActionMap(t)[key] || `${method.toUpperCase()} ${path}`;
};

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseStatusFilter = (value: string | null): AuditStatusFilter => {
  return STATUS_FILTER_VALUES.includes(value as AuditStatusFilter)
    ? (value as AuditStatusFilter)
    : 'all';
};

const parseDateRange = (
  searchParams: URLSearchParams,
): [Dayjs | null, Dayjs | null] | null => {
  const startValue = searchParams.get('start');
  const endValue = searchParams.get('end');
  const start = startValue ? dayjs(startValue) : null;
  const end = endValue ? dayjs(endValue) : null;

  if (!start && !end) {
    return null;
  }

  return [start?.isValid() ? start : null, end?.isValid() ? end : null];
};

const getPreviewData = (data?: AuditLog['data']) => {
  if (!data) {
    return null;
  }

  const { deps: _deps, commit: _commit, ...rest } = data;
  return Object.keys(rest).length ? rest : null;
};

const matchesStatusFilter = (
  statusCode: string,
  statusFilter: AuditStatusFilter,
) => {
  if (statusFilter === 'all') {
    return true;
  }

  const code = Number(statusCode);
  if (!Number.isFinite(code)) {
    return false;
  }

  if (statusFilter === 'success') {
    return code >= 200 && code < 300;
  }
  if (statusFilter === 'client-error') {
    return code >= 400 && code < 500;
  }
  return code >= 500;
};

const buildSearchText = (t: TranslateFn, log: AuditLog) => {
  return [
    log.id,
    getActionLabel(t, log.method, log.path),
    log.method,
    log.path,
    log.statusCode,
    log.ip,
    log.userAgent,
    getApiTokenLabel(log.apiTokens),
    JSON.stringify(getPreviewData(log.data) ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

export const AuditLogs = () => {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get('query')?.trim() ?? '',
  );

  const currentPage = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(
    searchParams.get('pageSize'),
    isMobile ? 10 : 20,
  );
  const query = searchParams.get('query')?.trim().toLowerCase() ?? '';
  const selectedAction = searchParams.get('action') ?? undefined;
  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const dateRange = parseDateRange(searchParams);
  const selectedLogId = searchParams.get('logId');

  const statusFilterOptions = getStatusFilterOptions(t);
  const actionOptions = getActionOptions(t);

  useEffect(() => {
    setSearchInput(searchParams.get('query')?.trim() ?? '');
  }, [searchParams]);

  useEffect(() => {
    const trimmedKeyword = searchInput.trim();
    const normalizedQuery = searchParams.get('query')?.trim() ?? '';
    if (trimmedKeyword === normalizedQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      patchSearchParams(setSearchParams, {
        query: trimmedKeyword || undefined,
        page: '1',
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, searchParams, setSearchParams]);

  const { allAuditLogs = [], isLoading } = useAuditLogs({
    offset: 0,
    limit: 1000,
  });

  const filteredAuditLogs = allAuditLogs.filter((log) => {
    if (
      selectedAction &&
      getActionKey(log.method, log.path) !== selectedAction
    ) {
      return false;
    }

    if (!matchesStatusFilter(log.statusCode, statusFilter)) {
      return false;
    }

    if (query && !buildSearchText(t, log).includes(query)) {
      return false;
    }

    if (!dateRange || (!dateRange[0] && !dateRange[1])) {
      return true;
    }

    const [startDate, endDate] = dateRange;
    const logDate = dayjs(log.createdAt);
    if (startDate && endDate) {
      return (
        logDate.isSameOrAfter(startDate.startOf('day')) &&
        logDate.isSameOrBefore(endDate.endOf('day'))
      );
    }
    if (startDate) {
      return logDate.isSameOrAfter(startDate.startOf('day'));
    }
    if (endDate) {
      return logDate.isSameOrBefore(endDate.endOf('day'));
    }
    return true;
  });

  const maxPage = Math.max(1, Math.ceil(filteredAuditLogs.length / pageSize));

  useEffect(() => {
    if (currentPage > maxPage) {
      patchSearchParams(setSearchParams, { page: String(maxPage) });
    }
  }, [currentPage, maxPage, setSearchParams]);

  const selectedLog = selectedLogId
    ? (allAuditLogs.find((log) => String(log.id) === selectedLogId) ?? null)
    : null;

  const disabledDate = (current: Dayjs | null) => {
    if (!current) return false;

    const today = dayjs();
    const oneHundredEightyDaysAgo = today.subtract(180, 'day');
    if (current.isAfter(today, 'day')) {
      return true;
    }
    if (current.isBefore(oneHundredEightyDaysAgo, 'day')) {
      return true;
    }
    if (dateRange?.[0] && !dateRange[1]) {
      const startDate = dateRange[0];
      const oneHundredEightyDaysLater = startDate.add(180, 'day');
      return (
        current.isBefore(startDate, 'day') ||
        current.isAfter(oneHundredEightyDaysLater, 'day')
      );
    }
    if (!dateRange?.[0] && dateRange?.[1]) {
      const endDate = dateRange[1];
      const oneHundredEightyDaysEarlier = endDate.subtract(180, 'day');
      return (
        current.isAfter(endDate, 'day') ||
        current.isBefore(oneHundredEightyDaysEarlier, 'day')
      );
    }
    return false;
  };

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null,
  ) => {
    if (dates?.[0] && dates[1]) {
      const startDate = dates[0];
      const endDate = dates[1];
      const diffInDays = endDate.diff(startDate, 'day');
      const nextEndDate =
        diffInDays > 180 ? startDate.add(180, 'day') : endDate;
      patchSearchParams(setSearchParams, {
        start: startDate.toISOString(),
        end: nextEndDate.toISOString(),
        page: '1',
      });
      return;
    }

    patchSearchParams(setSearchParams, {
      start: dates?.[0] ? dates[0].toISOString() : undefined,
      end: dates?.[1] ? dates[1].toISOString() : undefined,
      page: '1',
    });
  };

  const handleExportCsv = () => {
    if (filteredAuditLogs.length === 0) {
      return;
    }

    try {
      const rows = filteredAuditLogs.map((log) => {
        const date = dayjs(log.createdAt);
        const previewData = getPreviewData(log.data);
        let browserInfo = '-';
        let osInfo = '-';

        if (log.userAgent) {
          if (log.userAgent.startsWith('react-native-update-cli')) {
            const version = log.userAgent.split('/')[1] || '';
            browserInfo = `cli ${version}`.trim();
          } else {
            const { browser, os } = UAParser(log.userAgent);
            browserInfo =
              `${browser.name || '-'} ${browser.version || ''}`.trim();
            osInfo = `${os.name || '-'} ${os.version || ''}`.trim();
          }
        }

        return {
          time: date.format('YYYY-MM-DD HH:mm:ss'),
          action: getActionLabel(t, log.method, log.path),
          method: log.method.toUpperCase(),
          path: log.path,
          status: log.statusCode,
          payload: previewData ? JSON.stringify(previewData) : '-',
          browser: browserInfo,
          os: osInfo,
          ip: log.ip || '-',
          apiKey: getApiTokenLabel(log.apiTokens) || '-',
        };
      });

      const header = [
        t('audit_logs.col_time'),
        t('audit_logs.col_action'),
        t('audit_logs.detail_method'),
        t('audit_logs.col_path'),
        t('audit_logs.col_status'),
        t('audit_logs.col_payload'),
        t('audit_logs.col_browser'),
        t('audit_logs.col_os'),
        t('audit_logs.col_ip_addr'),
        'API Key',
      ];

      downloadCsv(
        `${t('audit_logs.sheet_name')}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`,
        [
          header,
          ...rows.map((row) => [
            row.time,
            row.action,
            row.method,
            row.path,
            row.status,
            row.payload,
            row.browser,
            row.os,
            row.ip,
            row.apiKey,
          ]),
        ],
      );
    } catch (error) {
      message.error(
        `${t('audit_logs.export_failed')}${(error as Error).message}`,
      );
    }
  };

  const columns: ColumnType<AuditLog>[] = [
    {
      title: t('audit_logs.col_time'),
      dataIndex: 'createdAt',
      width: 180,
      render: (createdAt: string) => {
        const date = dayjs(createdAt);
        return (
          <div>
            <div>{date.format('YYYY-MM-DD HH:mm:ss')}</div>
            <Text type="secondary" className="text-xs">
              {date.fromNow()}
            </Text>
          </div>
        );
      },
    },
    {
      title: t('audit_logs.col_action'),
      width: 140,
      render: (_value, record) => {
        const actionLabel = getActionLabel(t, record.method, record.path);
        const isDelete = record.method.toUpperCase() === 'DELETE';
        return (
          <span className={isDelete ? 'text-error' : undefined}>
            {actionLabel}
          </span>
        );
      },
    },
    {
      title: t('audit_logs.col_path'),
      width: 260,
      responsive: ['md'],
      render: (_value, record) => (
        <div className="min-w-0">
          <div className="font-mono text-xs text-gray-500">
            {record.method.toUpperCase()}
          </div>
          <div className="truncate font-mono text-xs" title={record.path}>
            {record.path}
          </div>
        </div>
      ),
    },
    {
      title: t('audit_logs.col_status'),
      dataIndex: 'statusCode',
      width: 110,
      render: (statusCode: string) => {
        const code = Number(statusCode);
        const color =
          code >= 500
            ? 'red'
            : code >= 400
              ? 'orange'
              : code >= 200
                ? 'green'
                : 'default';
        return <Tag color={color}>{statusCode}</Tag>;
      },
    },
    {
      title: t('audit_logs.col_payload'),
      responsive: ['lg'],
      width: 320,
      render: (_value, record) => {
        const previewData = getPreviewData(record.data);
        if (!previewData) {
          return <Text type="secondary">-</Text>;
        }

        const previewText = JSON.stringify(previewData);
        return (
          <Text
            ellipsis={{
              tooltip: (
                <pre className="max-w-[480px] whitespace-pre-wrap break-all">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              ),
            }}
          >
            {previewText}
          </Text>
        );
      },
    },
    {
      title: t('audit_logs.col_device'),
      dataIndex: 'userAgent',
      responsive: ['xl'],
      width: 220,
      render: (userAgent: string | undefined, record) => {
        const apiToken = getApiTokenLabel(record.apiTokens);
        const hasInfo = userAgent || record.ip || apiToken;
        if (!hasInfo) {
          return <Text type="secondary">-</Text>;
        }

        return (
          <div>
            {userAgent && <div>{getUA(userAgent)}</div>}
            {record.ip && (
              <div className="mt-1 text-xs text-gray-500">
                {t('audit_logs.ip_prefix')} {record.ip}
              </div>
            )}
            {apiToken && (
              <div className="mt-1 font-mono text-xs text-gray-500">
                {t('audit_logs.apikey_prefix')}
                {apiToken}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t('audit_logs.col_details'),
      key: 'detail',
      width: 90,
      render: (_value, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            patchSearchParams(setSearchParams, { logId: String(record.id) });
          }}
        >
          {t('audit_logs.view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-container p-4 shadow-sm md:p-5">
      <div className="mb-4">
        <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={4} className="m-0! flex items-center gap-2">
              <FileTextOutlined />
              {t('audit_logs.title')}
            </Title>
            <p className="mt-1 text-sm text-gray-500">
              {t('audit_logs.description')}
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <Input
              allowClear
              value={searchInput}
              prefix={<SearchOutlined />}
              placeholder={t('audit_logs.search_placeholder')}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full md:w-64"
            />
            <Select
              allowClear
              placeholder={t('audit_logs.action_placeholder')}
              options={actionOptions}
              value={selectedAction}
              onChange={(value) => {
                patchSearchParams(setSearchParams, {
                  action: value,
                  page: '1',
                });
              }}
              className="w-full md:w-52"
            />
            <Select
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(value) => {
                patchSearchParams(setSearchParams, {
                  status: value === 'all' ? undefined : value,
                  page: '1',
                });
              }}
              className="w-full md:w-44"
            />
            <RangePicker
              className="w-full md:w-auto"
              value={dateRange}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              placeholder={[
                t('audit_logs.start_date'),
                t('audit_logs.end_date'),
              ]}
              allowClear
              disabledDate={disabledDate}
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportCsv}
              disabled={filteredAuditLogs.length === 0}
              className="w-full md:w-auto"
            >
              {t('audit_logs.export_excel')}
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {t('audit_logs.matching_logs', {
            filtered: filteredAuditLogs.length,
            total: allAuditLogs.length,
          })}
        </div>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredAuditLogs}
        loading={isLoading}
        pagination={{
          current: currentPage,
          pageSize,
          total: filteredAuditLogs.length,
          showSizeChanger: !isMobile,
          showQuickJumper: !isMobile,
          simple: isMobile,
          showTotal: isMobile
            ? undefined
            : (count) => t('audit_logs.records_count', { count }),
          onChange: (page, nextPageSize) => {
            patchSearchParams(setSearchParams, {
              page: String(page),
              pageSize: String(nextPageSize),
            });
          },
        }}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: isMobile ? 860 : 1320 }}
        onRow={(record) => ({
          className: 'cursor-pointer',
          onClick: () => {
            patchSearchParams(setSearchParams, { logId: String(record.id) });
          },
        })}
      />

      <Drawer
        title={
          selectedLog
            ? t('audit_logs.detail_title', { id: selectedLog.id })
            : t('audit_logs.detail_title_default')
        }
        width={isMobile ? '100%' : 720}
        open={Boolean(selectedLog)}
        onClose={() => patchSearchParams(setSearchParams, { logId: undefined })}
      >
        {selectedLog && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions
              bordered
              column={1}
              size="small"
              items={[
                {
                  key: 'time',
                  label: t('audit_logs.detail_time'),
                  children: dayjs(selectedLog.createdAt).format(
                    'YYYY-MM-DD HH:mm:ss',
                  ),
                },
                {
                  key: 'action',
                  label: t('audit_logs.detail_action'),
                  children: getActionLabel(
                    t,
                    selectedLog.method,
                    selectedLog.path,
                  ),
                },
                {
                  key: 'method',
                  label: t('audit_logs.detail_method'),
                  children: selectedLog.method.toUpperCase(),
                },
                {
                  key: 'path',
                  label: t('audit_logs.detail_path'),
                  children: (
                    <Paragraph className="!mb-0 font-mono" copyable>
                      {selectedLog.path}
                    </Paragraph>
                  ),
                },
                {
                  key: 'status',
                  label: t('audit_logs.detail_status'),
                  children: selectedLog.statusCode,
                },
                {
                  key: 'ip',
                  label: t('audit_logs.detail_ip'),
                  children: selectedLog.ip || '-',
                },
                {
                  key: 'apiToken',
                  label: t('audit_logs.detail_apikey'),
                  children: getApiTokenLabel(selectedLog.apiTokens) || '-',
                },
              ]}
            />

            <div>
              <div className="mb-2 font-medium">
                {t('audit_logs.detail_payload')}
              </div>
              <pre className="max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(
                  getPreviewData(selectedLog.data) ?? {},
                  null,
                  2,
                )}
              </pre>
            </div>

            <div>
              <div className="mb-2 font-medium">
                {t('audit_logs.detail_ua')}
              </div>
              <pre className="whitespace-pre-wrap break-all rounded bg-gray-50 p-3 text-xs">
                {selectedLog.userAgent || '-'}
              </pre>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export const Component = AuditLogs;
