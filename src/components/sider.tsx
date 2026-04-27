import {
  AppstoreOutlined,
  FileTextOutlined,
  KeyOutlined,
  LineChartOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Card,
  Drawer,
  Input,
  Layout,
  Menu,
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { showCreateAppModal } from '@/components/create-app-modal';
import { PRICING_LINK } from '@/constants/links';
import { quotas } from '@/constants/quotas';
import { rootRouterPath, router } from '@/router';
import { getRecentAppIds, rememberRecentApp } from '@/utils/helper';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { ReactComponent as LogoH } from '../assets/logo-h.svg';
import PlatformIcon from './platform-icon';

interface SiderMenuProps {
  selectedKeys: string[];
  onNavigate?: () => void;
}

const style = {
  sider: { boxShadow: '2px 0 8px 0 rgb(29 35 41 / 5%)', zIndex: 2 },
};

const getSelectedKeys = (pathname: string) => {
  if (pathname === rootRouterPath.apps) {
    return ['apps:overview'];
  }

  const appMatch = pathname.match(/^\/apps\/([^/]+)/);
  if (appMatch) {
    return [`app:${appMatch[1]}`];
  }

  const key = pathname.replace(/^\//, '');
  return [key || 'user'];
};

const useSelectedKeys = () => {
  const { pathname } = useLocation();
  return getSelectedKeys(pathname);
};

export default function Sider() {
  const { user } = useUserInfo();
  const selectedKeys = useSelectedKeys();
  if (!user) return null;
  return (
    <Layout.Sider
      className="[&>.ant-layout-sider-children]:flex [&>.ant-layout-sider-children]:flex-col!"
      width={240}
      theme="light"
      style={style.sider}
    >
      <SiderContent selectedKeys={selectedKeys} />
    </Layout.Sider>
  );
}

export const SiderDrawer = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { user } = useUserInfo();
  const selectedKeys = useSelectedKeys();
  if (!user) return null;
  return (
    <Drawer
      open={open}
      placement="left"
      width={260}
      onClose={onClose}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      <SiderContent selectedKeys={selectedKeys} onNavigate={onClose} />
    </Drawer>
  );
};

const SiderContent = ({ selectedKeys, onNavigate }: SiderMenuProps) => (
  <>
    <Layout.Header className="flex justify-center items-center bg-transparent! px-0!">
      <LogoH className="h-7 w-auto" />
    </Layout.Header>
    <SiderMenu selectedKeys={selectedKeys} onNavigate={onNavigate} />
  </>
);

const SiderMenu = ({ selectedKeys, onNavigate }: SiderMenuProps) => {
  const { pathname } = useLocation();
  const { user, displayExpireDay, displayRemainingDays } = useUserInfo();
  const { apps } = useAppList();
  const [appSearch, setAppSearch] = useState('');
  const [recentAppIds, setRecentAppIds] = useState<number[]>(() =>
    getRecentAppIds(),
  );

  const currentAppId = useMemo(() => {
    const match = pathname.match(/^\/apps\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [pathname]);

  useEffect(() => {
    if (currentAppId) {
      setRecentAppIds(rememberRecentApp(currentAppId));
    }
  }, [currentAppId]);

  if (!user) {
    return null;
  }

  const quota = user.quota ?? quotas[user.tier as keyof typeof quotas];
  const pvQuota = quota?.pv;
  const consumedQuota = user.checkQuota;
  const percent =
    pvQuota && consumedQuota ? (consumedQuota / pvQuota) * 100 : undefined;
  const normalizedAppSearch = appSearch.trim().toLowerCase();
  const filteredApps = (apps ?? []).filter((app) => {
    if (!normalizedAppSearch) {
      return true;
    }
    return [app.name, app.appKey, app.platform]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedAppSearch));
  });
  const appMap = new Map((apps ?? []).map((app) => [app.id, app]));
  const recentApps = recentAppIds
    .map((id) => appMap.get(id))
    .filter((app): app is NonNullable<typeof apps>[number] => Boolean(app));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {percent && (
        <Card
          title={
            <div className="text-center py-1">
              <span>{user.email}</span>
              <br />
              <span className="font-normal">今日剩余总查询热更次数</span>
            </div>
          }
          size="small"
          className="mb-4! mr-0! md:mr-2!"
        >
          <Progress
            status={percent > 40 ? 'normal' : 'exception'}
            size={['100%', 30]}
            percent={percent}
            percentPosition={{ type: 'inner', align: 'center' }}
            format={() =>
              consumedQuota ? `${consumedQuota.toLocaleString()} 次` : ''
            }
          />
          <div className="mt-2 text-center text-xs">
            7日平均剩余次数：{user.last7dAvg?.toLocaleString()} 次
          </div>
          <div className="mt-2 text-center text-xs">
            <a target="_blank" href={PRICING_LINK} rel="noopener noreferrer">
              {quota?.title}
            </a>
            可用: {pvQuota?.toLocaleString()} 次/每日
          </div>
          {user.tier !== 'free' && (
            <div className="mt-2 text-center text-xs">
              有效期至：{displayExpireDay}
              {displayRemainingDays && (
                <>
                  <br />
                  <div>{displayRemainingDays}</div>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="px-3 pb-3">
        <Input
          allowClear
          value={appSearch}
          prefix={<SearchOutlined />}
          placeholder="搜索应用"
          onChange={(event) => setAppSearch(event.target.value)}
        />
        {recentApps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {recentApps.map((app) => (
              <Link key={app.id} to={rootRouterPath.versions(String(app.id))}>
                <Tag color={currentAppId === app.id ? 'blue' : undefined}>
                  <span className="inline-flex items-center gap-1">
                    <PlatformIcon platform={app.platform} />
                    {app.name}
                  </span>
                </Tag>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-y-auto">
        <Menu
          defaultOpenKeys={['apps', 'admin']}
          selectedKeys={selectedKeys}
          mode="inline"
          onClick={() => onNavigate?.()}
          items={[
            {
              key: 'user',
              icon: <UserOutlined />,
              label: <Link to={rootRouterPath.user}>账户设置</Link>,
            },
            {
              key: 'api-tokens',
              icon: <KeyOutlined />,
              label: <Link to={rootRouterPath.apiTokens}>API Token</Link>,
            },
            {
              key: 'audit-logs',
              icon: <FileTextOutlined />,
              label: <Link to={rootRouterPath.auditLogs}>操作日志</Link>,
            },
            {
              key: 'realtime-metrics',
              icon: <LineChartOutlined />,
              label: <Link to={rootRouterPath.realtimeMetrics}>实时数据</Link>,
            },
            {
              key: 'apps',
              icon: <AppstoreOutlined />,
              label: '应用管理',
              children: [
                {
                  key: 'apps:overview',
                  label: <Link to={rootRouterPath.apps}>应用列表</Link>,
                },
                ...(filteredApps.length > 0
                  ? filteredApps.map((app) => ({
                      key: `app:${app.id}`,
                      className: '!h-16',
                      label: (
                        <Link
                          to={rootRouterPath.versions(String(app.id))}
                          className="flex h-16 flex-row items-center gap-4"
                        >
                          <div className="flex flex-col justify-center">
                            <PlatformIcon
                              platform={app.platform}
                              className="text-xl!"
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            <div className="flex flex-row items-center font-bold">
                              <span className="truncate">{app.name}</span>
                              {app.status === 'paused' && (
                                <Tag className="ml-2">暂停</Tag>
                              )}
                            </div>
                            {app.checkCount !== undefined && (
                              <div className="mb-2 text-xs text-gray-500">
                                <Tooltip
                                  mouseEnterDelay={1}
                                  title="今日此应用查询热更的次数"
                                >
                                  <span>
                                    {app.checkCount.toLocaleString()} 次
                                  </span>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        </Link>
                      ),
                    }))
                  : [
                      {
                        key: 'apps:empty',
                        disabled: true,
                        label: appSearch ? '没有匹配的应用' : '还没有应用',
                      },
                    ]),
                {
                  key: 'add-app',
                  icon: <PlusOutlined />,
                  label: '添加应用',
                  onClick: () =>
                    showCreateAppModal({
                      onCreated: (id) =>
                        router.navigate(rootRouterPath.versions(String(id))),
                    }),
                },
              ],
            },
            ...(user.admin
              ? [
                  {
                    key: 'admin',
                    icon: <SettingOutlined />,
                    label: '管理员',
                    children: [
                      {
                        key: 'admin-config',
                        label: (
                          <Link to={rootRouterPath.adminConfig}>动态配置</Link>
                        ),
                      },
                      {
                        key: 'admin-users',
                        label: (
                          <Link to={rootRouterPath.adminUsers}>用户管理</Link>
                        ),
                      },
                      {
                        key: 'admin-apps',
                        label: (
                          <Link to={rootRouterPath.adminApps}>应用管理</Link>
                        ),
                      },
                      {
                        key: 'admin-metrics',
                        label: (
                          <Link to={rootRouterPath.adminMetrics}>全局统计</Link>
                        ),
                      },
                    ],
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
};
