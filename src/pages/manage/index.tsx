import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import { Checkbox, Dropdown, Grid, Input, Layout, type MenuProps, Tabs } from 'antd';

import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
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

type PackageFilter = 'all' | 'unused';

function toggleAllVisiblePackages(
  checked: boolean,
  packageIds: number[],
  setSelectedPackageIds: Dispatch<SetStateAction<number[]>>,
) {
  setSelectedPackageIds((prev) => {
    if (checked) {
      return [...new Set([...prev, ...packageIds])];
    }
    return prev.filter((id) => !packageIds.includes(id));
  });
}

const PackageFilterControl = ({
  filter,
  setFilter,
  dataSource,
  selectedPackageIds,
  setSelectedPackageIds,
}: {
  filter: PackageFilter;
  setFilter: (filter: PackageFilter) => void;
  dataSource: Package[];
  selectedPackageIds: number[];
  setSelectedPackageIds: Dispatch<SetStateAction<number[]>>;
}) => {
  const filterLabel = filter === 'all' ? '全部' : '未使用';
  const items: MenuProps['items'] = [
    {
      key: 'all',
      label: '全部',
      onClick: () => setFilter('all'),
    },
    {
      key: 'unused',
      label: '未使用',
      onClick: () => setFilter('unused'),
    },
  ];
  const packageIds = dataSource.map((item) => item.id);
  const selectedPackageIdSet = new Set(selectedPackageIds);
  const selectedVisibleCount = packageIds.filter((id) =>
    selectedPackageIdSet.has(id),
  ).length;
  const allVisibleSelected =
    packageIds.length > 0 && selectedVisibleCount === packageIds.length;

  return (
    <span className="inline-flex items-center gap-2">
      <Checkbox
        aria-label={`${filterLabel}全选`}
        checked={allVisibleSelected}
        disabled={packageIds.length === 0}
        indeterminate={selectedVisibleCount > 0 && !allVisibleSelected}
        onChange={({ target }) => {
          toggleAllVisiblePackages(
            target.checked,
            packageIds,
            setSelectedPackageIds,
          );
        }}
      />
      <Dropdown menu={{ items }} trigger={['hover']}>
        <button
          className="inline-flex h-10 cursor-pointer items-center gap-1 border-0 border-b-2 border-solid border-blue-500 bg-transparent px-1 text-sm font-medium text-blue-600"
          type="button"
        >
          <span>{filterLabel}</span>
          <DownOutlined className="text-xs" />
        </button>
      </Dropdown>
    </span>
  );
};

const ManageDashBoard = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { packages, unusedPackages, packagesLoading, bindingsLoading } =
    useManageContext();
  const [packageFilter, setPackageFilter] = useState<PackageFilter>('all');
  const [packageSearch, setPackageSearch] = useState('');
  const [selectedAllPackageIds, setSelectedAllPackageIds] = useState<number[]>(
    [],
  );
  const [selectedUnusedPackageIds, setSelectedUnusedPackageIds] = useState<
    number[]
  >([]);
  const changePackageFilter = (nextFilter: PackageFilter) => {
    setPackageFilter(nextFilter);
    if (nextFilter === 'unused') {
      setSelectedUnusedPackageIds([]);
    } else {
      setSelectedAllPackageIds([]);
    }
  };
  const isUnusedPackageFilter = packageFilter === 'unused';
  const allPackageDataSource = isUnusedPackageFilter ? unusedPackages : packages;
  const normalizedPackageSearch = packageSearch.trim().toLowerCase();
  const packageDataSource = useMemo(
    () =>
      normalizedPackageSearch
        ? allPackageDataSource.filter(
            (item) =>
              item.name.toLowerCase().includes(normalizedPackageSearch) ||
              item.note?.toLowerCase().includes(normalizedPackageSearch),
          )
        : allPackageDataSource,
    [allPackageDataSource, normalizedPackageSearch],
  );
  const selectedPackageIds = isUnusedPackageFilter
    ? selectedUnusedPackageIds
    : selectedAllPackageIds;
  const setSelectedPackageIds = isUnusedPackageFilter
    ? setSelectedUnusedPackageIds
    : setSelectedAllPackageIds;
  const packageList = (
    <>
      <div className="mb-2 flex items-center">
        <PackageFilterControl
          filter={packageFilter}
          setFilter={changePackageFilter}
          dataSource={packageDataSource}
          selectedPackageIds={selectedPackageIds}
          setSelectedPackageIds={setSelectedPackageIds}
        />
      </div>
      <PackageList
        key={packageFilter}
        dataSource={packageDataSource}
        loading={packagesLoading || (isUnusedPackageFilter && bindingsLoading)}
        selectedPackageIds={selectedPackageIds}
        setSelectedPackageIds={setSelectedPackageIds}
      />
    </>
  );

  const packageSearchInput = (
    <Input
      allowClear
      bordered={false}
      prefix={<SearchOutlined className="text-gray-400" />}
      placeholder="搜索"
      value={packageSearch}
      onChange={({ target }) => setPackageSearch(target.value)}
      className="rounded bg-gray-100 px-2 text-sm leading-8"
      style={{ width: 100 }}
    />
  );

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
              <div className="rounded-lg bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  {packageSearchInput}
                </div>
                {packageList}
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
        width={280}
        style={{ marginRight: 16, maxWidth: '100%' }}
      >
        <div className="flex shrink-0 items-center gap-2 py-4">
          原生包
          {packageSearchInput}
        </div>
        {packageList}
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
