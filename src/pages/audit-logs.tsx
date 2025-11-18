import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, DatePicker, Space, Table, Typography } from 'antd';
import type { ColumnType } from 'antd/lib/table';
import dayjs, { type Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuditLogs } from '@/utils/hooks';
import 'dayjs/locale/zh-cn';
import { UAParser } from 'ua-parser-js';

const { RangePicker } = DatePicker;

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale('zh-cn');

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

const { Text } = Typography;

// API 操作语义映射字典（精确匹配，只包含写操作）
const actionMap: Record<string, string> = {
  // 用户相关
  'POST /user/login': '登录',
  'POST /user/register': '注册',
  'POST /user/activate': '激活账户',
  'POST /user/activate/sendmail': '发送激活邮件',
  'POST /user/resetpwd/sendmail': '发送重置密码邮件',
  'POST /user/resetpwd/reset': '重置密码',
  // 应用相关
  'POST /app/create': '创建应用',
  // 订单相关
  'POST /orders': '创建订单',
  'POST /upload': '上传文件',
};

// 路径模式匹配（用于动态路径，只包含写操作）
const pathPatterns: Array<{
  pattern: RegExp;
  getAction: (method: string) => string;
}> = [
  {
    pattern: /^\/app\/\d+$/,
    getAction: (method) => {
      if (method === 'PUT') return '更新应用';
      if (method === 'DELETE') return '删除应用';
      return '';
    },
  },
  {
    pattern: /^\/app\/\d+\/package\/\d+$/,
    getAction: (method) => {
      if (method === 'PUT') return '修改原生包设置';
      if (method === 'DELETE') return '删除原生包';
      return '';
    },
  },
  {
    pattern: /^\/app\/\d+\/version\/\d+$/,
    getAction: (method) => {
      if (method === 'PUT') return '修改热更包设置';
      if (method === 'DELETE') return '删除热更包';
      if (method === 'POST') return '创建热更包';
      return '';
    },
  },
  {
    pattern: /^\/app\/\d+\/binding\/$/,
    getAction: () => '创建/更新绑定',
  },
  {
    pattern: /^\/app\/\d+\/binding\/\d+$/,
    getAction: () => '删除绑定',
  },
];

// 获取操作语义描述
const getActionLabel = (method: string, path: string): string => {
  const key = `${method.toUpperCase()} ${path}`;

  // 先尝试精确匹配
  if (actionMap[key]) {
    return actionMap[key];
  }

  // 尝试模式匹配
  for (const { pattern, getAction } of pathPatterns) {
    if (pattern.test(path)) {
      return getAction(method.toUpperCase());
    }
  }

  // 如果没有匹配到，返回原始 method + path
  return `${method.toUpperCase()} ${path}`;
};

const columns: ColumnType<AuditLog>[] = [
  {
    title: '时间',
    dataIndex: 'createdAt',
    width: 180,
    sorter: true,
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
    width: 120,
    render: (_, record) => {
      const actionLabel = getActionLabel(record.method, record.path);
      const isDelete = record.method.toUpperCase() === 'DELETE';
      const color = isDelete ? '#ff4d4f' : undefined;

      return (
        <span
          //   className="text-base font-medium"
          style={color ? { color } : undefined}
        >
          {actionLabel}
        </span>
      );
    },
  },
  {
    title: '状态码',
    dataIndex: 'statusCode',
    width: 100,
    render: (statusCode: string) => {
      const code = Number(statusCode);
      const isError = code >= 500;
      const color = isError ? '#ff4d4f' : undefined;

      return (
        <span className="font-medium" style={color ? { color } : undefined}>
          {statusCode}
        </span>
      );
    },
  },
  {
    title: '提交数据',
    width: 300,
    ellipsis: {
      showTitle: false,
    },
    render: (_, { path, data }: AuditLog) => {
      const isUpload = path.startsWith('/upload');
      if (isUpload) {
        if (data?.ext === '.ppk') {
          return <Text>热更包</Text>;
        } else {
          return <Text>原生包</Text>;
        }
      }
      return data ? (
        <Text ellipsis={{ tooltip: JSON.stringify(data, null, 2) }}>
          {JSON.stringify(data)}
        </Text>
      ) : (
        <Text type="secondary">-</Text>
      );
    },
  },
  {
    title: '设备信息',
    dataIndex: 'userAgent',
    width: 250,
    ellipsis: {
      showTitle: false,
    },
    render: (userAgent: string | undefined, record: AuditLog) => {
      const hasInfo = userAgent || record.ip;
      if (!hasInfo) {
        return <Text type="secondary">-</Text>;
      }

      return (
        <div title={userAgent || record.ip}>
          {userAgent && <div>{getUA(userAgent)}</div>}
          {record.ip && (
            <div className="mt-1">
              <Text type="secondary" className="text-xs">
                IP: {record.ip}
              </Text>
            </div>
          )}
        </div>
      );
    },
  },
  {
    title: 'API Key',
    dataIndex: ['apiTokens', 'tokenSuffix'],
    width: 120,
    render: (tokenSuffix?: string) =>
      tokenSuffix ? (
        <Text className="font-mono text-xs">****{tokenSuffix}</Text>
      ) : (
        <Text type="secondary">-</Text>
      ),
  },
];

export const AuditLogs = () => {
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);

  const { auditLogs: allAuditLogs, isLoading } = useAuditLogs({
    offset: 0,
    limit: 1000,
  });

  // 根据日期范围筛选日志
  const filteredAuditLogs = useMemo(() => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) {
      return allAuditLogs;
    }

    const [startDate, endDate] = dateRange;
    return allAuditLogs.filter((log) => {
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
  }, [allAuditLogs, dateRange]);

  // 前端分页
  const paginatedAuditLogs = useMemo(() => {
    const startIndex = offset;
    const endIndex = offset + pageSize;
    return filteredAuditLogs.slice(startIndex, endIndex);
  }, [filteredAuditLogs, offset, pageSize]);

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null,
  ) => {
    // 验证日期范围不超过180天
    if (dates?.[0] && dates?.[1]) {
      const startDate = dates[0];
      const endDate = dates[1];
      const diffInDays = endDate.diff(startDate, 'day');

      if (diffInDays > 180) {
        // 如果超过180天，自动调整为180天
        const adjustedEndDate = startDate.add(180, 'day');
        setDateRange([startDate, adjustedEndDate]);
      } else {
        setDateRange(dates);
      }
    } else {
      setDateRange(dates);
    }
    setOffset(0); // 重置到第一页
  };

  // 限制日期选择：不能超过180天，不能选择未来日期，不能选择超过180天前的日期
  const disabledDate = (current: Dayjs | null) => {
    if (!current) return false;

    const today = dayjs();
    const oneHundredEightyDaysAgo = today.subtract(180, 'day');

    // 不能选择未来日期
    if (current.isAfter(today, 'day')) {
      return true;
    }

    // 不能选择超过180天前的日期（从今天开始往过去超过180天）
    if (current.isBefore(oneHundredEightyDaysAgo, 'day')) {
      return true;
    }

    // 如果已经选择了开始日期，限制结束日期不能超过开始日期180天
    if (dateRange?.[0] && !dateRange[1]) {
      const startDate = dateRange[0];
      const oneHundredEightyDaysLater = startDate.add(180, 'day');
      return (
        current.isBefore(startDate, 'day') ||
        current.isAfter(oneHundredEightyDaysLater, 'day')
      );
    }

    // 如果已经选择了结束日期，限制开始日期不能早于结束日期180天
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

  // 导出到 Excel
  const handleExportToExcel = () => {
    if (filteredAuditLogs.length === 0) {
      return;
    }

    // 格式化数据
    const excelData = filteredAuditLogs.map((log) => {
      const date = dayjs(log.createdAt);
      const actionLabel = getActionLabel(log.method, log.path);

      // 解析 UA 信息
      let browserInfo = '-';
      let osInfo = '-';
      if (log.userAgent) {
        // 处理特殊的 CLI useragent 格式
        if (log.userAgent.startsWith('react-native-update-cli')) {
          const version = log.userAgent.split('/')[1] || '';
          browserInfo = `cli ${version}`.trim();
          osInfo = '-';
        } else {
          const { browser, os } = UAParser(log.userAgent);
          browserInfo =
            `${browser.name || '-'} ${browser.version || ''}`.trim();
          osInfo = `${os.name || '-'} ${os.version || ''}`.trim();
        }
      }

      return {
        时间: date.format('YYYY-MM-DD HH:mm:ss'),
        操作: actionLabel,
        状态码: log.statusCode,
        提交数据: log.data ? JSON.stringify(log.data) : '-',
        浏览器: browserInfo,
        操作系统: osInfo,
        IP地址: log.ip || '-',
        'API Key': `****${log.apiTokens?.tokenSuffix || '-'}`,
      };
    });

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 设置列宽
    const colWidths = [
      { wch: 20 }, // 时间
      { wch: 15 }, // 操作
      { wch: 10 }, // 状态码
      { wch: 40 }, // 提交数据
      { wch: 20 }, // 浏览器
      { wch: 20 }, // 操作系统
      { wch: 15 }, // IP地址
      { wch: 15 }, // 是否使用API
    ];
    ws['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '操作日志');

    // 生成文件名
    const fileName = `操作日志_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;

    // 导出文件
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileTextOutlined />
              操作日志
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              日志功能从 2025 年 11 月 17 日开始测试，没有更早的数据。将仅保留
              180 天内的数据。
            </p>
          </div>
          <Space>
            <RangePicker
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
            >
              导出 Excel
            </Button>
          </Space>
        </div>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={paginatedAuditLogs}
        loading={isLoading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          total: filteredAuditLogs.length,
          current: offset / pageSize + 1,
          pageSize,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange(page, size) {
            if (size) {
              setOffset((page - 1) * size);
              setPageSize(size);
            }
          },
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export const Component = AuditLogs;
