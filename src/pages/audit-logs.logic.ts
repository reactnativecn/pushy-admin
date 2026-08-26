import type { Dayjs } from 'dayjs';
import { UAParser } from 'ua-parser-js';
import type { AuditLog } from '@/types';
import type { CsvValue } from '@/utils/csv';
import dayjs from '@/utils/dayjs';

/**
 * 审计日志页的纯逻辑:动作归一化、筛选、日期范围约束、CSV 行。
 * 与页面组件分开是为了能在没有 antd/路由的环境下单测。
 */

export type TranslateFn = (
  key: string,
  options?: Record<string, unknown>,
) => string;

/** 动作 key(`METHOD /normalized/path`)-> 翻译后的动作名 */
export type ActionMap = Record<string, string>;

export type AuditStatusFilter =
  | 'all'
  | 'success'
  | 'client-error'
  | 'server-error';

export type AuditDateRange = [Dayjs | null, Dayjs | null] | null;

/** 日志只保留 180 天,选择器与单次查询跨度都以此为上限 */
export const AUDIT_DATE_RANGE_MAX_DAYS = 180;

const STATUS_FILTER_VALUES: AuditStatusFilter[] = [
  'all',
  'success',
  'client-error',
  'server-error',
];

export function getStatusFilterOptions(t: TranslateFn) {
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

export const getApiTokenLabel = (apiTokens?: AuditLog['apiTokens']) => {
  if (!apiTokens?.tokenSuffix) {
    return undefined;
  }

  return apiTokens.name
    ? `${apiTokens.name}(****${apiTokens.tokenSuffix})`
    : `****${apiTokens.tokenSuffix}`;
};

export const normalizePath = (path: string): string => {
  return path.replace(/\/\d+/g, '/{id}').replace(/\/$/, '');
};

// 每次渲染只构建一次,再传给筛选 / 列渲染 / 导出,别在上千行的 filter 里反复建表
export function getActionMap(t: TranslateFn): ActionMap {
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

export const getActionKey = (method: string, path: string): string =>
  `${method.toUpperCase()} ${normalizePath(path)}`;

export function getActionOptions(actionMap: ActionMap) {
  return Object.entries(actionMap)
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const getActionLabel = (
  actionMap: ActionMap,
  method: string,
  path: string,
): string => {
  const key = getActionKey(method, path);
  return actionMap[key] || `${method.toUpperCase()} ${path}`;
};

export const parseStatusFilter = (value: string | null): AuditStatusFilter => {
  return STATUS_FILTER_VALUES.includes(value as AuditStatusFilter)
    ? (value as AuditStatusFilter)
    : 'all';
};

export const parseDateRange = (
  searchParams: URLSearchParams,
): AuditDateRange => {
  const startValue = searchParams.get('start');
  const endValue = searchParams.get('end');
  const start = startValue ? dayjs(startValue) : null;
  const end = endValue ? dayjs(endValue) : null;

  if (!start && !end) {
    return null;
  }

  return [start?.isValid() ? start : null, end?.isValid() ? end : null];
};

export const getPreviewData = (data?: AuditLog['data']) => {
  if (!data) {
    return null;
  }

  const { deps: _deps, commit: _commit, ...rest } = data;
  return Object.keys(rest).length ? rest : null;
};

export const matchesStatusFilter = (
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

export const buildSearchText = (actionMap: ActionMap, log: AuditLog) => {
  return [
    log.id,
    getActionLabel(actionMap, log.method, log.path),
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

/** 单边区间只卡一头;整天对齐,和 RangePicker 只精确到日保持一致 */
export const matchesDateRange = (
  createdAt: string,
  dateRange: AuditDateRange,
) => {
  if (!dateRange || (!dateRange[0] && !dateRange[1])) {
    return true;
  }

  const [startDate, endDate] = dateRange;
  const logDate = dayjs(createdAt);
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
};

/**
 * RangePicker 的 disabledDate:不能选未来或 180 天前;
 * 已选了一头时,另一头只能落在离它 180 天以内。
 */
export const isAuditDateDisabled = (
  current: Dayjs | null,
  dateRange: AuditDateRange,
  today: Dayjs = dayjs(),
) => {
  if (!current) return false;

  const oneHundredEightyDaysAgo = today.subtract(
    AUDIT_DATE_RANGE_MAX_DAYS,
    'day',
  );
  if (current.isAfter(today, 'day')) {
    return true;
  }
  if (current.isBefore(oneHundredEightyDaysAgo, 'day')) {
    return true;
  }
  if (dateRange?.[0] && !dateRange[1]) {
    const startDate = dateRange[0];
    const oneHundredEightyDaysLater = startDate.add(
      AUDIT_DATE_RANGE_MAX_DAYS,
      'day',
    );
    return (
      current.isBefore(startDate, 'day') ||
      current.isAfter(oneHundredEightyDaysLater, 'day')
    );
  }
  if (!dateRange?.[0] && dateRange?.[1]) {
    const endDate = dateRange[1];
    const oneHundredEightyDaysEarlier = endDate.subtract(
      AUDIT_DATE_RANGE_MAX_DAYS,
      'day',
    );
    return (
      current.isAfter(endDate, 'day') ||
      current.isBefore(oneHundredEightyDaysEarlier, 'day')
    );
  }
  return false;
};

/** 选完区间要写回 URL 的参数;跨度超过 180 天时把结束日期拉回上限 */
export const getDateRangePatch = (
  dates: [Dayjs | null, Dayjs | null] | null,
): { start: string | undefined; end: string | undefined; page: string } => {
  if (dates?.[0] && dates[1]) {
    const startDate = dates[0];
    const endDate = dates[1];
    const diffInDays = endDate.diff(startDate, 'day');
    const nextEndDate =
      diffInDays > AUDIT_DATE_RANGE_MAX_DAYS
        ? startDate.add(AUDIT_DATE_RANGE_MAX_DAYS, 'day')
        : endDate;
    return {
      start: startDate.toISOString(),
      end: nextEndDate.toISOString(),
      page: '1',
    };
  }

  return {
    start: dates?.[0] ? dates[0].toISOString() : undefined,
    end: dates?.[1] ? dates[1].toISOString() : undefined,
    page: '1',
  };
};

/** 导出用的 UA 摘要:CLI 只有版本号,浏览器则拆成浏览器 / 系统两列 */
export const getUserAgentSummary = (userAgent?: string) => {
  let browserInfo = '-';
  let osInfo = '-';

  if (userAgent) {
    if (userAgent.startsWith('react-native-update-cli')) {
      const version = userAgent.split('/')[1] || '';
      browserInfo = `cli ${version}`.trim();
    } else {
      const { browser, os } = UAParser(userAgent);
      browserInfo = `${browser.name || '-'} ${browser.version || ''}`.trim();
      osInfo = `${os.name || '-'} ${os.version || ''}`.trim();
    }
  }

  return { browser: browserInfo, os: osInfo };
};

/** CSV 一行,列顺序与 getAuditCsvHeader 对齐 */
export const buildAuditCsvRow = (
  actionMap: ActionMap,
  log: AuditLog,
): CsvValue[] => {
  const previewData = getPreviewData(log.data);
  const { browser, os } = getUserAgentSummary(log.userAgent);

  return [
    dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    getActionLabel(actionMap, log.method, log.path),
    log.method.toUpperCase(),
    log.path,
    log.statusCode,
    previewData ? JSON.stringify(previewData) : '-',
    browser,
    os,
    log.ip || '-',
    getApiTokenLabel(log.apiTokens) || '-',
  ];
};

export const getAuditCsvHeader = (t: TranslateFn): CsvValue[] => [
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
