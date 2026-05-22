import { Grid, Layout, Tabs } from 'antd';

import { useParams } from 'react-router-dom';
import './manage.css';

import { AppDetailHeader } from '@/components/app-detail-header';
import { AppDrawerLayout, useAppWorkspaceList } from '@/components/app-drawer';
import { useAppSettingsModal } from '@/components/app-settings-modal';
import { rootRouterPath, router } from '@/router';
import { rememberRecentApp } from '@/utils/helper';
import { useApp } from '@/utils/hooks';
import PackageList from './components/package-list';
import VersionTable from './components/version-table';
import { ManageProvider, useManageContext } from './hooks/useManageContext';

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
  const params = useParams<{ id?: string }>();
  const id = Number(params.id!);
  const { app } = useApp(id);
  const { apps: appList, isLoading: isAppListLoading } = useAppWorkspaceList();
  const { contextHolder, openAppSettings } = useAppSettingsModal();
  const realtimeMetricsPath = app?.appKey
    ? `${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
        appKey: app.appKey,
      }).toString()}`
    : undefined;
  const content = (
    <ManageProvider appId={id} app={app}>
      {contextHolder}
      <AppDetailHeader
        activeView="management"
        app={app}
        appNameFallback="加载应用中"
        metricsDisabled={!realtimeMetricsPath}
        onMetricsClick={() => {
          if (realtimeMetricsPath) {
            router.navigate(realtimeMetricsPath);
          }
        }}
        onSettingsClick={app ? () => openAppSettings(app) : undefined}
        sectionLabel="应用"
      />
      <ManageDashBoard />
    </ManageProvider>
  );

  return (
    <AppDrawerLayout
      apps={appList ?? []}
      currentAppId={id}
      isLoading={isAppListLoading}
      onSelect={(selectedApp) => {
        rememberRecentApp(selectedApp.id);
        router.navigate(rootRouterPath.versions(String(selectedApp.id)));
      }}
      onSettings={openAppSettings}
    >
      {content}
    </AppDrawerLayout>
  );
};
export const Component = Manage;
