import {
  AndroidFilled,
  AppleFilled,
  AppstoreOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Card, Layout, Menu, Progress, Tag, Tooltip } from 'antd';
import { observable, runInAction } from 'mobx';
import { Link, useLocation } from 'react-router-dom';

import addApp from './pages/apps/add';
import { quotas } from './constants/quotas';
import { PRICING_LINK } from './constants/links';
import { rootRouterPath } from './router';
import { useAppList, useUserInfo } from './utils/hooks';

const state = observable.object({ selectedKeys: observable.array<string>() });

export default function Sider() {
  const { pathname } = useLocation();
  const { user } = useUserInfo();
  if (!user) return null;

  if (state.selectedKeys.length === 0) {
    runInAction(() => {
      if (pathname === '/') {
        state.selectedKeys = observable.array(['/user']);
      } else {
        state.selectedKeys = observable.array(pathname.replace(/^\//, '').split('/'));
      }
    });
  }
  return (
    <Layout.Sider width={240} theme='light' style={style.sider}>
      <Layout.Header style={style.logo}>Pushy</Layout.Header>
      <SiderMenu />
    </Layout.Sider>
  );
}

const SiderMenu = () => {
  const { user } = useUserInfo();
  const { apps } = useAppList();
  const quota = quotas[user?.tier as keyof typeof quotas];
  const pvQuota = quota?.pv;
  const consumedQuota = user?.checkQuota;
  const percent = pvQuota && consumedQuota ? (consumedQuota / pvQuota) * 100 : undefined;
  return (
    <div>
      {percent && (
        <Card
          title={<div className='text-center'>今日剩余总查询热更次数</div>}
          size='small'
          className='mr-2 mb-4'
        >
          <Progress
            status={percent && percent > 40 ? 'normal' : 'exception'}
            size={['100%', 30]}
            percent={percent}
            percentPosition={{ type: 'inner', align: 'center' }}
            format={() => (consumedQuota ? `${consumedQuota.toLocaleString()} 次` : '')}
          />
          <div className='text-xs mt-2 text-center'>
            7日平均剩余次数：{user?.last7dAvg?.toLocaleString()} 次
          </div>
          <div className='text-xs mt-2 text-center'>
            <a target='_blank' href={PRICING_LINK} rel='noreferrer'>
              {quota?.title}
            </a>
            可用: {pvQuota?.toLocaleString()} 次/每日
          </div>
        </Card>
      )}
      <Menu
        defaultOpenKeys={['apps']}
        selectedKeys={state.selectedKeys}
        onSelect={({ key }) => {
          if (key === 'add-app') return;
          runInAction(() => (state.selectedKeys = observable.array([key])));
        }}
        mode='inline'
      >
        <Menu.Item key='user' icon={<UserOutlined />}>
          <Link to={rootRouterPath.user}>账户设置</Link>
        </Menu.Item>
        <Menu.SubMenu key='apps' title='应用管理' icon={<AppstoreOutlined />}>
          {apps?.map((i) => (
            <Menu.Item key={i.id} className='!h-16'>
              <div className='flex flex-row items-center gap-4'>
                <div className='flex flex-col justify-center'>
                  {i.platform === 'ios' ? (
                    <AppleFilled style={style.ios} className='!text-xl' />
                  ) : (
                    <AndroidFilled style={style.android} className='!text-xl' />
                  )}
                </div>
                <Link to={`/apps/${i.id}`} className='flex flex-col h-16 justify-center'>
                  <div className='flex flex-row items-center font-bold'>
                    {i.name}
                    {i.status === 'paused' && <Tag className='ml-2'>暂停</Tag>}
                  </div>
                  {i.checkCount && (
                    <div className='text-xs text-gray-500 mb-2'>
                      <Tooltip mouseEnterDelay={1} title='今日此应用查询热更的次数'>
                        <a>{i.checkCount.toLocaleString()} 次</a>
                      </Tooltip>
                    </div>
                  )}
                </Link>
              </div>
            </Menu.Item>
          ))}
          <Menu.Item key='add-app' icon={<PlusOutlined />} onClick={addApp}>
            添加应用
          </Menu.Item>
        </Menu.SubMenu>
      </Menu>
    </div>
  );
};

const style: Style = {
  sider: { boxShadow: '2px 0 8px 0 rgb(29 35 41 / 5%)', zIndex: 2 },
  logo: {
    background: '#fff',
    color: '#1890ff',
    fontSize: 22,
    fontWeight: 600,
  },
  ios: { color: '#a6b1b7' },
  android: { color: '#3ddc84' },
};
