import {
  AndroidFilled,
  AppleFilled,
  AppstoreOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Tag } from 'antd';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Link, useLocation } from 'react-router-dom';
import { defaultRoute } from './main';
import addApp from './pages/apps/add';
import store from './store';

const state = observable.object({ selectedKeys: observable.array<string>() });

export default function Sider() {
  const { pathname } = useLocation();
  if (!store.token) return null;

  if (state.selectedKeys.length === 0) {
    runInAction(() => {
      if (pathname === '/') {
        state.selectedKeys = observable.array([defaultRoute]);
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

const SiderMenu = observer(() => (
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
      <Link to='/user'>账户设置</Link>
    </Menu.Item>
    <Menu.SubMenu key='apps' title='应用管理' icon={<AppstoreOutlined />}>
      {store.apps.map((i) => (
        <Menu.Item
          key={i.id}
          icon={
            i.platform === 'ios' ? (
              <AppleFilled style={style.ios} />
            ) : (
              <AndroidFilled style={style.android} />
            )
          }
        >
          <Link to={`/apps/${i.id}`}>
            {i.name}
            {i.status === 'paused' && <Tag style={{ marginLeft: 8 }}>暂停</Tag>}
          </Link>
        </Menu.Item>
      ))}
      <Menu.Item key='add-app' icon={<PlusOutlined />} onClick={addApp}>
        添加应用
      </Menu.Item>
    </Menu.SubMenu>
  </Menu>
));

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
