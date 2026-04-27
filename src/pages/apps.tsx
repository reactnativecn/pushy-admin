import {
  AppstoreOutlined,
  CopyOutlined,
  LineChartOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Grid,
  Input,
  message,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { showCreateAppModal } from '@/components/create-app-modal';
import PlatformIcon from '@/components/platform-icon';
import { rootRouterPath, router } from '@/router';
import type { App } from '@/types';
import { getRecentAppIds, patchSearchParams } from '@/utils/helper';
import { useAppList } from '@/utils/hooks';

const { Text, Title } = Typography;

export const Component = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { apps } = useAppList();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('search')?.trim() ?? '';
  const normalizedKeyword = keyword.toLowerCase();

  const filteredApps = useMemo(() => {
    const source = apps ?? [];
    if (!normalizedKeyword) {
      return source;
    }

    return source.filter((app) =>
      [app.name, app.appKey, app.platform]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedKeyword)),
    );
  }, [apps, normalizedKeyword]);

  const recentApps = useMemo(() => {
    if (!apps?.length) {
      return [];
    }

    const appMap = new Map(apps.map((app) => [app.id, app]));
    return getRecentAppIds()
      .map((id) => appMap.get(id))
      .filter((app): app is App => Boolean(app));
  }, [apps]);

  const columns: ColumnsType<App> = [
    {
      title: '应用',
      key: 'name',
      render: (_value, record) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PlatformIcon platform={record.platform} className="text-lg!" />
            <span className="truncate font-medium">{record.name}</span>
            {record.status === 'paused' && <Tag>暂停</Tag>}
          </div>
          <div className="mt-1 text-xs text-gray-500">{record.platform}</div>
        </div>
      ),
    },
    {
      title: 'App Key',
      dataIndex: 'appKey',
      key: 'appKey',
      responsive: ['lg'],
      render: (appKey: string | undefined) =>
        appKey ? (
          <Space size={[4, 8]} wrap>
            <span className="font-mono text-xs break-all">{appKey}</span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                navigator.clipboard.writeText(appKey);
                message.success('已复制 App Key');
              }}
            />
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '今日查询',
      dataIndex: 'checkCount',
      key: 'checkCount',
      responsive: ['md'],
      width: 120,
      render: (value: number | undefined) => value?.toLocaleString() ?? '-',
    },
    {
      title: '操作',
      key: 'action',
      width: isMobile ? 96 : 180,
      render: (_value, record) => (
        <Space size={[0, 0]} wrap>
          <Button
            type="link"
            onClick={(event) => {
              event.stopPropagation();
              router.navigate(rootRouterPath.versions(String(record.id)));
            }}
          >
            管理
          </Button>
          {record.appKey && (
            <Link
              to={`${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
                appKey: record.appKey,
              }).toString()}`}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <Button type="link" icon={<LineChartOutlined />}>
                数据
              </Button>
            </Link>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={4} className="m-0!">
              应用列表
            </Title>
            <Text type="secondary">
              统一查看、搜索并进入应用管理页，不再依赖侧栏滚动查找。
            </Text>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索应用名 / App Key / 平台"
              value={keyword}
              onChange={(event) => {
                patchSearchParams(setSearchParams, {
                  search: event.target.value.trim() || undefined,
                });
              }}
              className="w-full md:w-72"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="w-full md:w-auto"
              onClick={() => {
                showCreateAppModal({
                  onCreated: (id) =>
                    router.navigate(rootRouterPath.versions(String(id))),
                });
              }}
            >
              添加应用
            </Button>
          </div>
        </div>

        {recentApps.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <AppstoreOutlined />
              最近访问
            </div>
            <div className="flex flex-wrap gap-2">
              {recentApps.map((app) => (
                <Link key={app.id} to={rootRouterPath.versions(String(app.id))}>
                  <Tag className="cursor-pointer">
                    <span className="inline-flex items-center gap-1">
                      <PlatformIcon platform={app.platform} />
                      {app.name}
                    </span>
                  </Tag>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Table
          rowKey="id"
          dataSource={filteredApps}
          columns={columns}
          size={isMobile ? 'small' : 'middle'}
          pagination={
            isMobile
              ? { pageSize: 10, simple: true }
              : { pageSize: 12, showSizeChanger: true }
          }
          locale={{
            emptyText: keyword ? '没有匹配的应用' : '还没有应用，先创建一个',
          }}
          scroll={{ x: 720 }}
          onRow={(record) => ({
            className: 'cursor-pointer',
            onClick: (event) => {
              const target = event.target as HTMLElement;
              if (target.closest('button,a')) {
                return;
              }
              router.navigate(rootRouterPath.versions(String(record.id)));
            },
          })}
        />
      </Card>
    </div>
  );
};
