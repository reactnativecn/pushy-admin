/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState } from 'react';
import {
  AndroidFilled,
  AppleFilled,
  AppstoreOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Card, Layout, Menu, Progress, Tag, Tooltip } from 'antd';
// import { observable, runInAction } from 'mobx';
// import { observer } from 'mobx-react-lite';
import { Link, useLocation } from 'react-router-dom';
import { defaultRoute } from './main';
import addApp from './pages/apps/add';
// import store from './store';
import quotas from './constants/quotas.json';
import { PRICING_LINK } from './constants/links';
import useUserInfo from './hooks/useUserInfo';
import useAppList from './hooks/useApplist';

// const state = observable.object({ selectedKeys: observable.array<string>() });

export default function Sider() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const { pathname } = useLocation();

  const token = localStorage.getItem('token');
  if (!token) return null;

  if (selectedKeys?.length === 0) {
    if (pathname === '/') {
      setSelectedKeys([defaultRoute]);
      // state.selectedKeys = observable.array([defaultRoute]);
    } else {
      setSelectedKeys(pathname?.replace(/^\//, '')?.split('/'));
      // state.selectedKeys = observable.array(pathname.replace(/^\//, '').split('/'));
    }
    // runInAction(() => {
    // });
  }
  return (
    <Layout.Sider width={240} theme='light' style={style.sider}>
      <Layout.Header style={style.logo}>Pushy</Layout.Header>
      <SiderMenu selectedKeys={selectedKeys} setSelectedKeys={setSelectedKeys} />
    </Layout.Sider>
  );
}

const SiderMenu = ({ selectedKeys, setSelectedKeys }) => {
  const { userInfo } = useUserInfo();
  const { appList } = useAppList();

  const quota = quotas[userInfo?.tier];
  const pvQuota = quota?.pv;
  const consumedQuota = userInfo?.checkQuota;
  const percent = pvQuota && consumedQuota ? (consumedQuota / pvQuota) * 100 : undefined;

  return (
    <div>
      <Card
        title={<div className='text-center'>今日剩余总查询热更次数</div>}
        size='small'
        className='mr-2 mb-4'
      >
        <Progress
          status={percent > 40 ? 'normal' : 'exception'}
          size={['100%', 30]}
          percent={percent}
          percentPosition={{ type: 'inner', align: 'center' }}
          format={() => (consumedQuota ? `${consumedQuota.toLocaleString()} 次` : '')}
        />
        <div className='text-xs mt-2 text-center'>
          <a target='_blank' href={PRICING_LINK} rel='noreferrer'>
            {quota?.title}
          </a>
          : {pvQuota?.toLocaleString()} 次/每日
        </div>
      </Card>
      <Menu
        defaultOpenKeys={['apps']}
        selectedKeys={selectedKeys}
        onSelect={({ key }) => {
          if (key === 'add-app') return;
          setSelectedKeys([key]);
          // runInAction(() => (state.selectedKeys = observable.array([key])));
        }}
        mode='inline'
      >
        <Menu.Item key='user' icon={<UserOutlined />}>
          <Link to='/user'>账户设置</Link>
        </Menu.Item>
        <Menu.SubMenu key='apps' title='应用管理' icon={<AppstoreOutlined />}>
          {appList?.map((i) => (
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
