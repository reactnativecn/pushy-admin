import {
  AppstoreOutlined,
  LeftOutlined,
  LineChartOutlined,
  RightOutlined,
  SearchOutlined,
  SettingFilled,
} from '@ant-design/icons';
import {
  Breadcrumb,
  Button,
  Col,
  Empty,
  Form,
  Grid,
  Input,
  Layout,
  Modal,
  message,
  Radio,
  Row,
  Space,
  Tabs,
  Tag,
} from 'antd';

import { useParams } from 'react-router-dom';
import './manage.css';

import { useEffect, useMemo, useState } from 'react';
import PlatformIcon from '@/components/platform-icon';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import {
  cn,
  getManageAppDrawerCollapsed,
  getManageAppDrawerPlacement,
  type ManageAppDrawerPlacement,
  manageAppDrawerCollapsedChangeEvent,
  manageAppDrawerPlacementChangeEvent,
  rememberRecentApp,
  setManageAppDrawerCollapsed,
  setManageAppDrawerPlacement,
} from '@/utils/helper';
import { useApp, useAppList } from '@/utils/hooks';
import PackageList from './components/package-list';
import SettingModal from './components/setting-modal';
import VersionTable from './components/version-table';
import { ManageProvider, useManageContext } from './hooks/useManageContext';

type AppItem = NonNullable<ReturnType<typeof useAppList>['apps']>[number];

const ManageDashBoard = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { packages, unusedPackages, packagesLoading } = useManageContext();
  const packageTabItems = [
    {
      key: 'all',
      label: '全部',
      children: <PackageList dataSource={packages} loading={packagesLoading} />,
    },
    {
      key: 'unused',
      label: '未使用',
      children: (
        <PackageList dataSource={unusedPackages} loading={packagesLoading} />
      ),
    },
  ];

  if (isMobile) {
    return (
      <Tabs
        defaultActiveKey="versions"
        size="small"
        items={[
          {
            key: 'versions',
            label: '热更包',
            children: <VersionTable />,
          },
          {
            key: 'packages',
            label: '原生包',
            children: (
              <div className="rounded-lg bg-white px-4 pb-4 pt-1">
                <Tabs
                  defaultActiveKey="all"
                  size="small"
                  items={packageTabItems}
                />
              </div>
            ),
          },
        ]}
      />
    );
  }

  return (
    <Layout className="manage-layout">
      <Layout.Sider
        theme="light"
        className="manage-sider h-full rounded-lg p-4 pt-0"
        width={240}
        style={{ marginRight: 16, maxWidth: '100%' }}
      >
        <div className="py-4">原生包</div>
        <Tabs size="middle" items={packageTabItems} />
      </Layout.Sider>
      <Layout.Content className="p-0! manage-content" style={{ minWidth: 0 }}>
        <VersionTable />
      </Layout.Content>
    </Layout>
  );
};

export const Manage = () => {
  const [modal, contextHolder] = Modal.useModal();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const params = useParams<{ id?: string }>();
  const id = Number(params.id!);
  const { app } = useApp(id);
  const [appDrawerPlacement, setAppDrawerPlacementState] = useState(
    getManageAppDrawerPlacement,
  );
  const [isAppDrawerCollapsed, setIsAppDrawerCollapsedState] = useState(
    getManageAppDrawerCollapsed,
  );
  const realtimeMetricsPath = app?.appKey
    ? `${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
        appKey: app.appKey,
      }).toString()}`
    : undefined;
  const [form] = Form.useForm<App>();
  useEffect(() => {
    if (app) {
      form.setFieldsValue(app);
    }
  }, [app, form]);

  useEffect(() => {
    const syncDrawerState = () => {
      setAppDrawerPlacementState(getManageAppDrawerPlacement());
      setIsAppDrawerCollapsedState(getManageAppDrawerCollapsed());
    };

    window.addEventListener(
      manageAppDrawerPlacementChangeEvent,
      syncDrawerState,
    );
    window.addEventListener(
      manageAppDrawerCollapsedChangeEvent,
      syncDrawerState,
    );
    window.addEventListener('storage', syncDrawerState);
    return () => {
      window.removeEventListener(
        manageAppDrawerPlacementChangeEvent,
        syncDrawerState,
      );
      window.removeEventListener(
        manageAppDrawerCollapsedChangeEvent,
        syncDrawerState,
      );
      window.removeEventListener('storage', syncDrawerState);
    };
  }, []);

  const handleAppDrawerPlacementChange = (
    placement: ManageAppDrawerPlacement,
  ) => {
    setAppDrawerPlacementState(placement);
    setManageAppDrawerPlacement(placement);
  };

  const handleAppDrawerCollapsedChange = (collapsed: boolean) => {
    setIsAppDrawerCollapsedState(collapsed);
    setManageAppDrawerCollapsed(collapsed);
  };

  const content = (
    <Form layout="vertical" form={form} initialValues={app}>
      <Row className="mb-4 flex-col gap-3 md:flex-row md:items-center">
        <Col flex={1} className="min-w-0">
          <Breadcrumb
            items={[
              {
                title: '应用',
              },
              {
                title: (
                  <span className="inline-flex max-w-full items-center gap-1">
                    <PlatformIcon platform={app?.platform} className="mr-1" />
                    <span className="max-w-[160px] truncate md:max-w-none">
                      {app?.name}
                    </span>
                    {app?.status === 'paused' && (
                      <Tag className="ml-2">暂停</Tag>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </Col>
        <Space.Compact
          direction={!screens.md ? 'vertical' : 'horizontal'}
          className="w-full md:w-auto"
        >
          <Button
            type="primary"
            icon={<SettingFilled />}
            className="w-full md:w-auto"
            onClick={() => {
              modal.confirm({
                icon: null,
                closable: true,
                maskClosable: true,
                width: !screens.md ? 'calc(100vw - 32px)' : 520,
                content: <SettingModal />,
                async onOk() {
                  try {
                    await api.updateApp(id, {
                      name: form.getFieldValue('name') as string,
                      downloadUrl: form.getFieldValue('downloadUrl') as string,
                      status: form.getFieldValue('status') as
                        | 'normal'
                        | 'paused',
                      ignoreBuildTime: form.getFieldValue('ignoreBuildTime') as
                        | 'enabled'
                        | 'disabled',
                    });
                  } catch (e) {
                    message.error((e as Error).message);
                    return;
                  }
                  message.success('修改成功');
                },
              });
            }}
          >
            应用设置
          </Button>
          <Button
            icon={<LineChartOutlined />}
            className="w-full md:w-auto"
            disabled={!realtimeMetricsPath}
            onClick={() => {
              if (realtimeMetricsPath) {
                router.navigate(realtimeMetricsPath);
              }
            }}
          >
            实时数据
          </Button>
        </Space.Compact>
      </Row>
      <ManageProvider appId={id} app={app}>
        {contextHolder}
        <ManageDashBoard />
      </ManageProvider>
    </Form>
  );

  if (isMobile) {
    return content;
  }

  if (appDrawerPlacement === 'hidden') {
    return content;
  }

  const appDrawer = (
    <DesktopAppDrawer
      collapsed={isAppDrawerCollapsed}
      currentAppId={id}
      onCollapsedChange={handleAppDrawerCollapsedChange}
      onPlacementChange={handleAppDrawerPlacementChange}
      placement={appDrawerPlacement}
    />
  );

  const appDrawerWidth = isAppDrawerCollapsed ? '64px' : '280px';

  return (
    <div
      className="grid items-start gap-4"
      style={{
        gridTemplateColumns:
          appDrawerPlacement === 'left'
            ? `${appDrawerWidth} minmax(0, 1fr)`
            : `minmax(0, 1fr) ${appDrawerWidth}`,
      }}
    >
      {appDrawerPlacement === 'left' && appDrawer}
      <div className="min-w-0 flex-1">{content}</div>
      {appDrawerPlacement === 'right' && appDrawer}
    </div>
  );
};
export const Component = Manage;

function DesktopAppDrawer({
  collapsed,
  currentAppId,
  onCollapsedChange,
  onPlacementChange,
  placement,
}: {
  collapsed: boolean;
  currentAppId: number;
  onCollapsedChange: (collapsed: boolean) => void;
  onPlacementChange: (placement: ManageAppDrawerPlacement) => void;
  placement: Exclude<ManageAppDrawerPlacement, 'hidden'>;
}) {
  const { apps: appList, isLoading } = useAppList();
  const [query, setQuery] = useState('');
  const apps = appList ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredApps = useMemo(() => {
    if (!normalizedQuery) {
      return apps;
    }
    return apps.filter((app) =>
      [app.name, app.appKey, app.platform]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [apps, normalizedQuery]);

  const openApp = (appId: number) => {
    rememberRecentApp(appId);
    router.navigate(rootRouterPath.versions(String(appId)));
  };

  const ToggleIcon = collapsed
    ? placement === 'right'
      ? LeftOutlined
      : RightOutlined
    : placement === 'right'
      ? RightOutlined
      : LeftOutlined;

  return (
    <div
      className={cn(
        'sticky top-20 h-[calc(100vh-112px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        collapsed ? 'w-16' : 'w-[280px]',
      )}
    >
      <div className="flex h-full flex-col">
        <button
          aria-label={collapsed ? '展开应用列表' : '收起应用列表'}
          className={cn(
            'flex w-full items-center border-0 border-slate-100 border-b bg-transparent text-left transition-colors hover:bg-slate-50',
            collapsed ? 'h-14 justify-center' : 'justify-between p-3',
          )}
          onClick={() => onCollapsedChange(!collapsed)}
          title={collapsed ? '展开应用列表' : '收起应用列表'}
          type="button"
        >
          {collapsed ? (
            <ToggleIcon className="text-slate-500" />
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <AppstoreOutlined className="text-slate-500" />
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">应用列表</div>
                  <div className="text-slate-500 text-xs">
                    共 {apps.length.toLocaleString()} 个应用
                  </div>
                </div>
              </div>
              <ToggleIcon className="shrink-0 text-slate-500" />
            </>
          )}
        </button>

        {!collapsed && (
          <>
            <div className="border-slate-100 border-b px-3 py-3">
              <Radio.Group
                buttonStyle="solid"
                onChange={(event) => {
                  onPlacementChange(
                    event.target.value as ManageAppDrawerPlacement,
                  );
                }}
                optionType="button"
                size="small"
                value={placement}
              >
                <Radio.Button value="left">左侧</Radio.Button>
                <Radio.Button value="right">右侧</Radio.Button>
                <Radio.Button value="hidden">隐藏</Radio.Button>
              </Radio.Group>
            </div>
            <div className="border-slate-100 border-b p-3">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索应用"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {collapsed ? (
            <div className="space-y-1">
              {apps.map((app) => (
                <AppIconButton
                  app={app}
                  isActive={app.id === currentAppId}
                  key={app.id}
                  onSelect={openApp}
                />
              ))}
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="space-y-1.5">
              {filteredApps.map((app) => (
                <AppDrawerRow
                  app={app}
                  isActive={app.id === currentAppId}
                  key={app.id}
                  onSelect={openApp}
                />
              ))}
            </div>
          ) : (
            !isLoading && (
              <Empty
                className="my-8"
                description="没有匹配的应用"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function AppIconButton({
  app,
  isActive,
  onSelect,
}: {
  app: AppItem;
  isActive: boolean;
  onSelect: (appId: number) => void;
}) {
  return (
    <button
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent transition-colors hover:bg-slate-100',
        isActive ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : undefined,
      )}
      onClick={() => onSelect(app.id)}
      title={`${app.name} · ${formatCheckCount(app)}`}
      type="button"
    >
      <PlatformIcon platform={app.platform} />
    </button>
  );
}

function AppDrawerRow({
  app,
  isActive,
  onSelect,
}: {
  app: AppItem;
  isActive: boolean;
  onSelect: (appId: number) => void;
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
        isActive ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : undefined,
      )}
      onClick={() => onSelect(app.id)}
      type="button"
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isActive ? 'bg-blue-100' : 'bg-slate-100',
        )}
      >
        <PlatformIcon platform={app.platform} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium text-sm">{app.name}</span>
          {app.status === 'paused' && <Tag className="m-0 shrink-0">暂停</Tag>}
        </span>
        <span className="block truncate text-slate-500 text-xs">
          {formatCheckCount(app)}
        </span>
      </span>
    </button>
  );
}

function formatCheckCount(app: AppItem) {
  return `${(app.checkCount ?? 0).toLocaleString()} 次检查`;
}
