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
import dayjs, { type Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UAParser } from 'ua-parser-js';
import { patchSearchParams } from '@/utils/helper';
import { useAuditLogs } from '@/utils/hooks';
import 'dayjs/locale/zh-cn';

const { RangePicker } = DatePicker;
const { Paragraph, Text } = Typography;

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale('zh-cn');

type AuditStatusFilter = 'all' | 'success' | 'client-error' | 'server-error';

const statusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '2xx 成功', value: 'success' },
  { label: '4xx 客户端错误', value: 'client-error' },
  { label: '5xx 服务端错误', value: 'server-error' },
] satisfies Array<{ label: string; value: AuditStatusFilter }>;

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

const actionMap: Record<string, string> = {
  'POST /user/login': '登录',
  'POST /user/register': '注册',
  'POST /user/activate': '激活账户',
  'POST /user/activate/sendmail': '发送激活邮件',
  'POST /user/resetpwd/sendmail': '发送重置密码邮件',
  'POST /user/resetpwd/reset': '重置密码',
  'POST /app/create': '创建应用',
  'PUT /app/{id}': '修改应用设置',
  'DELETE /app/{id}': '删除应用',
  'POST /orders': '创建订单',
  'POST alipayCallback': '支付',
  'POST /upload': '上传文件',
  'POST /app/{id}/package/create': '创建原生包',
  'PUT /app/{id}/package/{id}': '修改原生包设置',
  'DELETE /app/{id}/package/{id}': '删除原生包',
  'POST /app/{id}/version/create': '创建热更包',
  'PUT /app/{id}/version/{id}': '修改热更包设置',
  'DELETE /app/{id}/version/{id}': '删除热更包',
  'POST /app/{id}/binding': '创建/更新绑定',
  'DELETE /app/{id}/binding/{id}': '删除绑定',
  'POST /api-token/create': '创建 API Key',
  'DELETE /api-token/{id}': '删除 API Key',
};

const actionOptions = Object.values(actionMap)
  .sort()
  .map((value) => ({
    label: value,
    value,
  }));

const getActionLabel = (method: string, path: string): string => {
  const normalizedPath = normalizePath(path);
  const key = `${method.toUpperCase()} ${normalizedPath}`;
  return actionMap[key] || `${method.toUpperCase()} ${path}`;
};

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseStatusFilter = (value: string | null): AuditStatusFilter => {
  return statusFilterOptions.some((option) => option.value === value)
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

const buildSearchText = (log: AuditLog) => {
  return [
    log.id,
    getActionLabel(log.method, log.path),
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

  const filteredAuditLogs = useMemo(() => {
    return allAuditLogs.filter((log) => {
      if (
        selectedAction &&
        getActionLabel(log.method, log.path) !== selectedAction
      ) {
        return false;
      }

      if (!matchesStatusFilter(log.statusCode, statusFilter)) {
        return false;
      }

      if (query && !buildSearchText(log).includes(query)) {
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
  }, [allAuditLogs, dateRange, query, selectedAction, statusFilter]);

  const maxPage = Math.max(1, Math.ceil(filteredAuditLogs.length / pageSize));

  useEffect(() => {
    if (currentPage > maxPage) {
      patchSearchParams(setSearchParams, { page: String(maxPage) });
    }
  }, [currentPage, maxPage, setSearchParams]);

  const selectedLog = useMemo(() => {
    if (!selectedLogId) {
      return null;
    }

    return allAuditLogs.find((log) => String(log.id) === selectedLogId) ?? null;
  }, [allAuditLogs, selectedLogId]);

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

  const handleExportToExcel = async () => {
    if (filteredAuditLogs.length === 0) {
      return;
    }

    try {
      const XLSX = await import('xlsx');

      const excelData = filteredAuditLogs.map((log) => {
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
          时间: date.format('YYYY-MM-DD HH:mm:ss'),
          操作: getActionLabel(log.method, log.path),
          方法: log.method.toUpperCase(),
          接口: log.path,
          状态码: log.statusCode,
          提交数据: previewData ? JSON.stringify(previewData) : '-',
          浏览器: browserInfo,
          操作系统: osInfo,
          IP地址: log.ip || '-',
          'API Key': getApiTokenLabel(log.apiTokens) || '-',
        };
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 10 },
        { wch: 36 },
        { wch: 10 },
        { wch: 40 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, '操作日志');
      XLSX.writeFile(
        workbook,
        `操作日志_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`,
      );
    } catch (error) {
      message.error(`导出失败：${(error as Error).message}`);
    }
  };

  const columns: ColumnType<AuditLog>[] = [
    {
      title: '时间',
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
      title: '操作',
      width: 140,
      render: (_value, record) => {
        const actionLabel = getActionLabel(record.method, record.path);
        const isDelete = record.method.toUpperCase() === 'DELETE';
        return (
          <span style={isDelete ? { color: '#ff4d4f' } : undefined}>
            {actionLabel}
          </span>
        );
      },
    },
    {
      title: '接口',
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
      title: '状态码',
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
      title: '提交数据',
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
      title: '设备信息',
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
              <div className="mt-1 text-xs text-gray-500">IP: {record.ip}</div>
            )}
            {apiToken && (
              <div className="mt-1 font-mono text-xs text-gray-500">
                API Key：{apiToken}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '详情',
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
          查看
        </Button>
      ),
    },
  ];

  return (
    <div className="page-section">
      <div className="mb-4">
        <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold md:text-xl">
              <FileTextOutlined />
              操作日志
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              日志功能从 2025 年 11 月 17 日开始测试，没有更早的数据。将仅保留
              180 天内的数据。
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <Input
              allowClear
              value={searchInput}
              prefix={<SearchOutlined />}
              placeholder="搜索操作、接口、IP、API Key"
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full md:w-64"
            />
            <Select
              allowClear
              placeholder="操作类型"
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
              placeholder={['开始日期', '结束日期']}
              allowClear
              disabledDate={disabledDate}
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportToExcel}
              disabled={filteredAuditLogs.length === 0}
              className="w-full md:w-auto"
            >
              导出 Excel
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          当前筛选结果 {filteredAuditLogs.length} 条，共载入{' '}
          {allAuditLogs.length} 条最近日志。
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
          showTotal: isMobile ? undefined : (count) => `共 ${count} 条记录`,
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
        title={selectedLog ? `日志详情 #${selectedLog.id}` : '日志详情'}
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
                  label: '时间',
                  children: dayjs(selectedLog.createdAt).format(
                    'YYYY-MM-DD HH:mm:ss',
                  ),
                },
                {
                  key: 'action',
                  label: '操作',
                  children: getActionLabel(
                    selectedLog.method,
                    selectedLog.path,
                  ),
                },
                {
                  key: 'method',
                  label: '方法',
                  children: selectedLog.method.toUpperCase(),
                },
                {
                  key: 'path',
                  label: '接口',
                  children: (
                    <Paragraph className="!mb-0 font-mono" copyable>
                      {selectedLog.path}
                    </Paragraph>
                  ),
                },
                {
                  key: 'status',
                  label: '状态码',
                  children: selectedLog.statusCode,
                },
                {
                  key: 'ip',
                  label: 'IP',
                  children: selectedLog.ip || '-',
                },
                {
                  key: 'apiToken',
                  label: 'API Key',
                  children: getApiTokenLabel(selectedLog.apiTokens) || '-',
                },
              ]}
            />

            <div>
              <div className="mb-2 font-medium">提交数据</div>
              <pre className="max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs">
                {JSON.stringify(
                  getPreviewData(selectedLog.data) ?? {},
                  null,
                  2,
                )}
              </pre>
            </div>

            <div>
              <div className="mb-2 font-medium">User-Agent</div>
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
