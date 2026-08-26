import {
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
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
import { useTranslation } from 'react-i18next';
import { UAParser } from 'ua-parser-js';
import type { AuditLog } from '@/types';
import { downloadCsv } from '@/utils/csv';
import dayjs from '@/utils/dayjs';
import { patchSearchParams } from '@/utils/helper';
import { useAuditLogs } from '@/utils/hooks';
import {
  getTablePagination,
  usePageClamp,
  useUrlTableState,
} from '@/utils/table-state';
import {
  buildAuditCsvRow,
  buildSearchText,
  getActionKey,
  getActionLabel,
  getActionMap,
  getActionOptions,
  getApiTokenLabel,
  getAuditCsvHeader,
  getDateRangePatch,
  getPreviewData,
  getStatusFilterOptions,
  isAuditDateDisabled,
  matchesDateRange,
  matchesStatusFilter,
  parseDateRange,
  parseStatusFilter,
} from './audit-logs.logic';

const { RangePicker } = DatePicker;
const { Paragraph, Text, Title } = Typography;

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

export const AuditLogs = () => {
  const { t } = useTranslation();
  const tableState = useUrlTableState({ searchParam: 'query' });
  const {
    searchParams,
    setSearchParams,
    isMobile,
    searchQuery,
    searchInput,
    setSearchInput,
    handleTableChange,
  } = tableState;

  const query = searchQuery.toLowerCase();
  const selectedAction = searchParams.get('action') ?? undefined;
  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const dateRange = parseDateRange(searchParams);
  const selectedLogId = searchParams.get('logId');

  const statusFilterOptions = getStatusFilterOptions(t);
  const actionMap = getActionMap(t);
  const actionOptions = getActionOptions(actionMap);

  // 日期范围交给服务端,这样缩小范围就能看到被条数上限挡在外面的旧日志
  const { auditLogs, total, isLoading, isPlaceholderData } = useAuditLogs({
    startDate: dateRange?.[0]?.startOf('day').toISOString(),
    endDate: dateRange?.[1]?.endOf('day').toISOString(),
  });
  const isCapped = total > auditLogs.length;

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (
      selectedAction &&
      getActionKey(log.method, log.path) !== selectedAction
    ) {
      return false;
    }

    if (!matchesStatusFilter(log.statusCode, statusFilter)) {
      return false;
    }

    if (query && !buildSearchText(actionMap, log).includes(query)) {
      return false;
    }

    return matchesDateRange(log.createdAt, dateRange);
  });

  usePageClamp(
    tableState,
    filteredAuditLogs.length,
    !isLoading && !isPlaceholderData,
  );

  const selectedLog = selectedLogId
    ? (auditLogs.find((log) => String(log.id) === selectedLogId) ?? null)
    : null;

  const disabledDate = (current: Dayjs | null) =>
    isAuditDateDisabled(current, dateRange);

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null,
  ) => {
    patchSearchParams(setSearchParams, getDateRangePatch(dates));
  };

  const handleExportCsv = () => {
    if (filteredAuditLogs.length === 0) {
      return;
    }

    try {
      downloadCsv(
        `${t('audit_logs.sheet_name')}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`,
        [
          getAuditCsvHeader(t),
          ...filteredAuditLogs.map((log) => buildAuditCsvRow(actionMap, log)),
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
      width: 210,
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
      width: 210,
      render: (_value, record) => {
        const actionLabel = getActionLabel(
          actionMap,
          record.method,
          record.path,
        );
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
      width: 240,
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
      width: 90,
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
      width: 200,
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
            total: auditLogs.length,
          })}
        </div>
        {isCapped && (
          <Alert
            type="warning"
            showIcon
            className="mt-2"
            message={t('audit_logs.capped_notice', {
              loaded: auditLogs.length,
              total,
            })}
          />
        )}
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredAuditLogs}
        loading={isLoading}
        onChange={handleTableChange}
        pagination={getTablePagination(
          tableState,
          filteredAuditLogs.length,
          (count) => t('audit_logs.records_count', { count }),
        )}
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
                    actionMap,
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
