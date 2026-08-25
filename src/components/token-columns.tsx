import { DeleteOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Tag, Tooltip } from 'antd';
import type { ColumnType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';

/** API Key 与 MCP 连接共有的字段，表格公共列只依赖这些 */
export interface TokenRow {
  id: number;
  name: string;
  tokenSuffix: string;
  appIds?: number[] | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isExpired: boolean;
  isRevoked: boolean;
}

/** 两张页面各有自己的 i18n 命名空间，文案翻译好再传进来，避免动态拼 key */
export interface TokenColumnTexts {
  colName: string;
  revoked: string;
  expired: string;
  colToken: string;
  colApps: string;
  allApps: string;
  nApps: (count: number) => string;
  colExpires: string;
  never: string;
  colLastUsed: string;
  neverUsed: string;
  colAction: string;
  revokeTitle: string;
  revokeDesc: string;
  revokeButton: string;
  yes: string;
  no: string;
}

export interface TokenColumnsOptions {
  texts: TokenColumnTexts;
  /** 名称列前的图标 */
  icon: ReactNode;
  appNameById: Map<number, string>;
  onRevoke: (id: number) => void;
  /** 过期时间格式：API Key 精确到分钟，MCP 只到日期 */
  expiresFormat?: string;
  /** 「全部应用」标签颜色 */
  allAppsTagColor?: string;
}

/**
 * API Key / MCP 连接列表共用的列。返回单列对象而不是数组，
 * 由页面按自己的顺序拼装并插入各自独有的列（权限、client 等）。
 */
export function getTokenColumns<T extends TokenRow>({
  texts,
  icon,
  appNameById,
  onRevoke,
  expiresFormat = 'YYYY-MM-DD HH:mm',
  allAppsTagColor,
}: TokenColumnsOptions) {
  const name: ColumnType<T> = {
    title: texts.colName,
    dataIndex: 'name',
    key: 'name',
    render: (value: string, record: T) => (
      <Space wrap size={[4, 8]}>
        {icon}
        {value}
        {record.isRevoked && <Tag color="red">{texts.revoked}</Tag>}
        {record.isExpired && !record.isRevoked && (
          <Tag color="orange">{texts.expired}</Tag>
        )}
      </Space>
    ),
  };

  const tokenSuffix: ColumnType<T> = {
    title: texts.colToken,
    dataIndex: 'tokenSuffix',
    key: 'tokenSuffix',
    render: (suffix: string) => (
      <span className="font-mono text-xs text-gray-500 break-all">
        ****{suffix}
      </span>
    ),
  };

  const apps: ColumnType<T> = {
    title: texts.colApps,
    dataIndex: 'appIds',
    key: 'appIds',
    responsive: ['md'],
    render: (appIds: TokenRow['appIds']) =>
      appIds?.length ? (
        <Tooltip
          title={appIds.map((id) => appNameById.get(id) ?? `#${id}`).join(', ')}
        >
          <Tag color="blue">{texts.nApps(appIds.length)}</Tag>
        </Tooltip>
      ) : (
        <Tag color={allAppsTagColor}>{texts.allApps}</Tag>
      ),
  };

  const expires: ColumnType<T> = {
    title: texts.colExpires,
    dataIndex: 'expiresAt',
    key: 'expiresAt',
    responsive: ['sm'],
    render: (expiresAt: string | null) =>
      expiresAt ? dayjs(expiresAt).format(expiresFormat) : texts.never,
  };

  const lastUsed: ColumnType<T> = {
    title: texts.colLastUsed,
    dataIndex: 'lastUsedAt',
    key: 'lastUsedAt',
    responsive: ['lg'],
    render: (lastUsedAt: string | null) =>
      lastUsedAt
        ? dayjs(lastUsedAt).format('YYYY-MM-DD HH:mm')
        : texts.neverUsed,
  };

  const action: ColumnType<T> = {
    title: texts.colAction,
    key: 'action',
    render: (_: unknown, record: T) => (
      <Popconfirm
        title={texts.revokeTitle}
        description={texts.revokeDesc}
        onConfirm={() => onRevoke(record.id)}
        okText={texts.yes}
        cancelText={texts.no}
        disabled={record.isRevoked}
      >
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={record.isRevoked}
        >
          {texts.revokeButton}
        </Button>
      </Popconfirm>
    ),
  };

  return { name, tokenSuffix, apps, expires, lastUsed, action };
}
